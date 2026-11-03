/**
 * AI 中间件（只在 Vite dev server 里跑）
 *
 * 两个接口：
 *   POST /api/recognize  看图识别（需要视觉模型，DeepSeek 目前不支持）
 *   POST /api/ai         文本任务：给这一餐写备注 / 回答用户的追问
 *
 * key 只在这里用，不会被打进前端包。
 * 换真后端时把这两个 handler 搬到 Express / 云函数即可，前端不用改。
 */
import { AI } from './aiConfig.js'

const NUTRIENTS = ['碳水', '蛋白质', '脂肪', '纤维', '糖', '盐']
const MEALS = ['早餐', '午餐', '下午茶', '晚餐']

/* ---------------- 视觉识别 ---------------- */

const VISION_PROMPT = `你是「Sushine 食物手账」里的食物识别与营养估算模块。看这张照片，按下面的 JSON 返回这一餐的信息，不要输出任何解释、不要用 markdown 代码块。

字段要求：
- name：中文菜名，4–8 个字，尽量具体（写「番茄鸡蛋面」而不是「面条」）
- emoji：一个最贴合的食物 emoji
- meal：只能是 早餐 / 午餐 / 下午茶 / 晚餐 之一
- kcal：整数，按图中实际分量的估算热量
- weight：形如「约 480 g」
- confidence：0–100 的整数
- nutrition：固定 6 项，label 依次为 碳水 / 蛋白质 / 脂肪 / 纤维 / 糖 / 盐，unit 都是 g，value 是数字
- note：不超过 20 个中文字
- tag：两个字左右的分类，如 外卖 / 家常 / 快餐 / 日料

只输出一个 JSON 对象。`

/* ---------------- 文本任务 ---------------- */

const NOTE_PROMPT = `你在给「Sushine 食物手账」写一行备注。
根据给出的一餐数据，写一句不超过 20 个中文字的话：
- 具体一点，像自己随手记的，不要空泛（别写「这一餐很美味」）
- 不要 emoji、不要引号、不要书名号
- 不要复述热量数字，那是旁边单独显示的
只输出 JSON：{"note":"..."}`

const SUSHIE_PERSONA = `你是食物手账 App「Sushine」里的助手 Sushie，语气像熟的朋友，简短、具体、不说教。

规则：
- 只聊吃饭、营养、热量、下顿吃什么、怎么吃更好这类话题；跑题就一句话拉回来
- 中文口语，不超过 80 个字，不要 emoji，不要分点，不要 markdown
- 给建议时尽量带数字（克数、热量），别写「多吃蔬菜」这种空话
- 只基于下面给出的数据回答，不知道就说不知道，不要编`

const MOCK_VISION = {
  name: '鸭腿饭',
  emoji: '🍗',
  meal: '午餐',
  kcal: 680,
  weight: '约 520 g',
  confidence: 88,
  tag: '外卖',
  note: '卤鸭腿配青菜，今天认真吃完了一整盒',
  nutrition: [
    { label: '碳水', value: 78, unit: 'g' },
    { label: '蛋白质', value: 32, unit: 'g' },
    { label: '脂肪', value: 26, unit: 'g' },
    { label: '纤维', value: 4, unit: 'g' },
    { label: '糖', value: 6, unit: 'g' },
    { label: '盐', value: 2.1, unit: 'g' }
  ]
}

const MOCK_NOTE = { note: '卤汁别整盒拌进饭里，留一半' }
const MOCK_ANSWER = { answer: '晚餐来份清蒸鱼加半碗杂粮饭，约 520 kcal，正好补上今天的余量。' }

export function aiServer() {
  return {
    name: 'sushine-ai',
    configureServer(server) {
      server.middlewares.use('/api/recognize', async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { ok: false, reason: 'method' })

        const body = await readBody(req).catch((e) => ({ __err: e.message }))
        if (body.__err) return send(res, 400, { ok: false, reason: 'bad-body', message: body.__err })

        const image = body?.image
        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
          return send(res, 400, { ok: false, reason: 'no-image', message: '缺少图片' })
        }

        if (AI.mock) return send(res, 200, { ok: true, source: 'mock', data: MOCK_VISION })

        // 没配视觉模型：说清楚原因，别让前端以为是网络问题
        if (!AI.visionModel || !AI.visionKey) {
          return send(res, 200, {
            ok: false,
            reason: 'no-vision',
            message: '当前模型不支持图片输入，识别已走本地估算'
          })
        }

        try {
          const text = await callChat({
            baseUrl: AI.visionBaseUrl || AI.baseUrl,
            apiKey: AI.visionKey,
            model: AI.visionModel,
            maxTokens: 700,
            messages: [
              { role: 'system', content: VISION_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: '请识别这一餐。' },
                  { type: 'image_url', image_url: { url: image } }
                ]
              }
            ]
          })
          const data = normalizeVision(text)
          if (!data) return send(res, 200, { ok: false, reason: 'unparsable' })
          return send(res, 200, { ok: true, source: 'ai', data })
        } catch (err) {
          return send(res, 200, { ok: false, reason: 'upstream', message: String(err.message || err) })
        }
      })

      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { ok: false, reason: 'method' })

        const body = await readBody(req).catch((e) => ({ __err: e.message }))
        if (body.__err) return send(res, 400, { ok: false, reason: 'bad-body', message: body.__err })

        const task = body?.task
        if (!['note', 'ask'].includes(task)) {
          return send(res, 400, { ok: false, reason: 'bad-task' })
        }

        if (AI.mock) {
          return send(res, 200, { ok: true, source: 'mock', data: task === 'note' ? MOCK_NOTE : MOCK_ANSWER })
        }
        if (!AI.apiKey) {
          return send(res, 200, { ok: false, reason: 'no-key', message: '未配置 API key' })
        }

        try {
          const data =
            task === 'note' ? await runNote(body.context) : await runAsk(body.context, body.question, body.history)
          if (!data) return send(res, 200, { ok: false, reason: 'unparsable' })
          return send(res, 200, { ok: true, source: 'ai', data })
        } catch (err) {
          return send(res, 200, { ok: false, reason: 'upstream', message: String(err.message || err) })
        }
      })

      /**
       * 模型文件代理。
       * huggingface.co 在国内连不上，hf-mirror.com 能下但不给 CORS 头，
       * 浏览器直接 fetch 会被拦 —— 所以由 dev server 转一手。
       * 只放行 Xenova/ 开头的仓库，避免变成开放代理。
       */
      server.middlewares.use('/api/model', async (req, res) => {
        const path = String(req.url || '').replace(/^\/+/, '')
        if (!path.startsWith('Xenova/')) return send(res, 403, { ok: false, reason: 'forbidden' })

        try {
          const upstream = await fetch(`${AI.modelMirror}/${path}`)
          if (!upstream.ok) {
            res.statusCode = upstream.status
            return res.end()
          }

          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
          const length = upstream.headers.get('content-length')
          if (length) res.setHeader('Content-Length', length)

          const { Readable } = await import('node:stream')
          Readable.fromWeb(upstream.body).pipe(res)
        } catch (err) {
          send(res, 502, { ok: false, reason: 'mirror', message: String(err.message || err) })
        }
      })
    }
  }
}

/* ---------------- 两个文本任务 ---------------- */

async function runNote(context) {
  const text = await callChat({
    model: AI.model,
    maxTokens: 200,
    messages: [
      { role: 'system', content: NOTE_PROMPT },
      { role: 'user', content: describeMeal(context) }
    ]
  })
  const raw = extractJson(text)
  const note = String(raw?.note || '').trim().replace(/^["'「]|["'」]$/g, '')
  if (!note) return null
  return { note: note.slice(0, 24) }
}

async function runAsk(context, question, history) {
  const q = String(question || '').trim().slice(0, 120)
  if (!q) return null

  const turns = Array.isArray(history) ? history.slice(-6) : []
  const messages = [
    { role: 'system', content: `${SUSHIE_PERSONA}\n\n今天的数据：\n${describeMeal(context)}` },
    ...turns
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 200) })),
    { role: 'user', content: q }
  ]

  const text = await callChat({ model: AI.model, maxTokens: 600, messages })
  const answer = cleanAnswer(text)
  return answer ? { answer } : null
}

/** 把这一餐的数据说成模型看得懂的一段话（只喂数字，不喂用户自由文本） */
function describeMeal(ctx = {}) {
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
  const nutrition = Array.isArray(ctx.nutrition)
    ? ctx.nutrition
        .filter((n) => n && n.label)
        .map((n) => `${String(n.label).slice(0, 6)} ${num(n.value)}g`)
        .join('、')
    : ''

  return [
    `菜名：${String(ctx.name || '未知').slice(0, 20)}`,
    `餐次：${MEALS.includes(ctx.meal) ? ctx.meal : '午餐'}`,
    `热量：${Math.round(num(ctx.kcal))} kcal`,
    `分量：${String(ctx.weight || '一份').slice(0, 20)}`,
    nutrition ? `营养成分：${nutrition}` : '',
    `今日已摄入：${Math.round(num(ctx.todayKcal))} kcal，目标 ${Math.round(num(ctx.goal, 1800))} kcal`
  ]
    .filter(Boolean)
    .join('\n')
}

/* ---------------- 底层调用 ---------------- */

async function callChat({ baseUrl = AI.baseUrl, apiKey = AI.apiKey, model, maxTokens, messages }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.6, messages })
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`上游 ${res.status} ${text.slice(0, 160)}`)
    }

    const json = await res.json()
    const message = json?.choices?.[0]?.message
    return String(message?.content || message?.reasoning_content || '')
  } finally {
    clearTimeout(timer)
  }
}

/* ---------------- 整形 ---------------- */

function extractJson(text) {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return null
  }
}

/** 去掉 markdown 记号、多余空白，截到 120 字 —— 气泡里放不下长篇大论 */
function cleanAnswer(text) {
  let s = String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+([，。！？；、])/g, '$1')

  if (s.length > 120) {
    const cut = s.slice(0, 120)
    const end = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('？'), cut.lastIndexOf('！'))
    s = end > 60 ? cut.slice(0, end + 1) : `${cut}…`
  }
  return s
}

/** 把模型的自由发挥收拾成表单能吃的形状 */
function normalizeVision(text) {
  const raw = extractJson(text)
  if (!raw || typeof raw !== 'object') return null

  const num = (v, fallback = 0, min = 0, max = 99999) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
  }

  const byLabel = new Map()
  if (Array.isArray(raw.nutrition)) {
    for (const item of raw.nutrition) {
      if (item && item.label) byLabel.set(String(item.label).trim(), item)
    }
  }

  return {
    name: String(raw.name || '').trim().slice(0, 14) || '未命名的一餐',
    emoji: String(raw.emoji || '🍽').slice(0, 4),
    meal: MEALS.includes(raw.meal) ? raw.meal : '午餐',
    kcal: Math.round(num(raw.kcal, 0, 0, 3000)),
    weight: String(raw.weight || '').slice(0, 20) || '一份',
    confidence: Math.round(num(raw.confidence, 80, 0, 100)),
    tag: String(raw.tag || '记录').slice(0, 4),
    note: String(raw.note || '').slice(0, 40),
    nutrition: NUTRIENTS.map((label) => ({
      label,
      value: Math.round(num(byLabel.get(label)?.value, 0, 0, 2000) * 10) / 10,
      unit: 'g'
    }))
  }
}

/* ---------------- 小工具 ---------------- */

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('请求体太大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}
