/**
 * 前端侧的食物识别入口。
 *
 * 只认 `POST /api/recognize` 这一个接口：dev 环境由 vite 插件（server/aiRecognize.js）实现，
 * 换成真后端时前端一行都不用改。
 *
 * 任何失败（没 key、超时、断网、模型抽风）都只是返回 ok:false，
 * 调用方继续用本地假数据 —— 答辩现场断网也演示得下去。
 */
const ENDPOINT = '/api/recognize'
const DEFAULT_TIMEOUT = 14000

/**
 * 原图可能来自两种地方：用户相册（已经是 dataURL）或者工程里的示例图（站点路径）。
 * 统一转成 dataURL 再发 —— 服务端只接受内联图片，避免它去访问任意 URL。
 */
export async function toSendableImage(src, max = 1024) {
  if (!src) return ''
  if (src.startsWith('data:')) return src

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = src
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return ''
  }
}

/**
 * 识别一张图。三层，逐级降级：
 *   1. 服务端视觉模型（配了 AI_VISION_* 才启用，质量最好）
 *   2. 浏览器本地 CLIP（146MB，一次下载后离线可用）
 *   3. 都不行就返回失败，调用方继续用假数据
 */
export async function recognizeFood(image, { timeout = DEFAULT_TIMEOUT, hint = '', onProgress } = {}) {
  if (!image) return { ok: false, reason: 'no-image' }

  const payloadUrl = await toSendableImage(image)
  if (!payloadUrl) return { ok: false, reason: 'unreadable-image' }

  const remote = await callServerVision(payloadUrl, { timeout, hint })
  if (remote.ok) return remote

  // 服务端没有视觉模型（或网络不通）→ 本地跑 CLIP
  try {
    const { recognizeLocally } = await import('./localVision')
    const data = await recognizeLocally(payloadUrl, { onProgress })
    return { ok: true, source: 'local', data }
  } catch (err) {
    return { ...remote, localError: String(err?.message || err) }
  }
}

async function callServerVision(payloadUrl, { timeout, hint }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: payloadUrl, hint }),
      signal: ctrl.signal
    })

    const payload = await res.json().catch(() => null)
    if (!payload?.ok) {
      return { ok: false, reason: payload?.reason || 'bad-response', message: payload?.message }
    }
    return { ok: true, source: payload.source || 'ai', data: payload.data }
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 把识别结果写进草稿。只覆盖「识别得出」的字段，
 * 用户已经手动改过的名字 / 备注不动。
 */
export function applyRecognition(draft, data) {
  if (!draft || !data) return
  draft.name = data.name
  draft.emoji = data.emoji
  draft.meal = data.meal
  draft.kcal = data.kcal
  draft.weight = data.weight
  draft.confidence = data.confidence
  draft.tag = data.tag
  draft.portionHint = 'AI 按画面估算 · 改完营养值同步'
  draft.nutrition = data.nutrition.map((n) => ({ ...n }))
  // 本地 CLIP 只给菜名和营养，备注留给后面的文字模型去写
  if (data.note && (!draft.note || draft.note.startsWith('刚刚记下'))) draft.note = data.note
}

/* ---------------- 文本任务（DeepSeek） ---------------- */

const TEXT_ENDPOINT = '/api/ai'

/**
 * 给这一餐写一句手账备注。
 * 输入只喂数字和菜名，不喂用户自由文本 —— 避免把奇怪的东西塞进 prompt。
 */
export async function generateNote(context, { timeout = 16000 } = {}) {
  const res = await postJson(TEXT_ENDPOINT, { task: 'note', context }, timeout)
  if (!res.ok) return res
  const note = String(res.data?.note || '').trim()
  return note ? { ok: true, source: res.source, note } : { ok: false, reason: 'empty' }
}

/** 拿 Sushie 的追问去问模型；history 传 [{role:'user'|'assistant', content}] */
export async function askSushie(question, { context, history = [], timeout = 20000 } = {}) {
  const res = await postJson(TEXT_ENDPOINT, { task: 'ask', question, context, history }, timeout)
  if (!res.ok) return res
  const answer = String(res.data?.answer || '').trim()
  return answer ? { ok: true, source: res.source, answer } : { ok: false, reason: 'empty' }
}

/** 把草稿拼成模型需要的上下文（服务端还会再裁一遍长度） */
export function mealContext(draft, { todayKcal = 0, goal = 1800 } = {}) {
  if (!draft) return {}
  return {
    name: draft.name,
    meal: draft.meal,
    kcal: draft.kcal,
    weight: draft.weight,
    nutrition: draft.nutrition,
    todayKcal,
    goal
  }
}

async function postJson(path, payload, timeout) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    })
    const json = await res.json().catch(() => null)
    if (!json?.ok) return { ok: false, reason: json?.reason || 'bad-response', message: json?.message }
    return { ok: true, source: json.source || 'ai', data: json.data }
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}
