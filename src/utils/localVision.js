/**
 * 浏览器端本地视觉识别（CLIP 零样本）。
 *
 * 为什么用它：DeepSeek 只有文本模型，看不了图；而我又不想让「识别」永远吃假数据。
 * CLIP 能在浏览器里跑：把图片编码成向量，再跟 `data/dishes.js` 里的菜品描述比相似度。
 *
 * 用的是官方 zero-shot pipeline —— 我试过把视觉 / 文本编码器拆开自己算
 * （能省一半时间），但那个拆分版的文本塔明显退化，几张图都判错，所以放弃了。
 * 现在每条标签约 0.13s，20 道菜 ≈ 2s，换来的是识别是对的。
 *
 * 代价：首次要下载约 146MB 权重（之后走浏览器 Cache Storage，加载 ~0.5s）。
 * 模型源：huggingface.co 国内连不上，hf-mirror.com 没有 CORS 头，
 * 所以本地开发统一走 dev server 的 /api/model 代理；
 * 部署成纯静态站点（GitHub Pages 等）时没有这个代理，就直接试 huggingface.co。
 */
import { DISHES, DISH_PROMPTS } from '../data/dishes'

const MODEL_ID = 'Xenova/clip-vit-base-patch32'
export const MODEL_SIZE_MB = 146

/** 按顺序尝试：先 dev 代理，不行再直连官方源 */
function modelSources() {
  return [`${location.origin}/api/model`, 'https://huggingface.co']
}

let classifier = null
let loading = null

async function loadClassifier(onProgress) {
  if (classifier) return classifier
  if (loading) return loading

  loading = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false

    let lastError = null
    for (const host of modelSources()) {
      env.remoteHost = host
      try {
        classifier = await pipeline('zero-shot-image-classification', MODEL_ID, {
          dtype: 'q8',
          progress_callback: (p) => {
            if (!onProgress) return
            if (p?.status === 'progress' && p.total) {
              onProgress(Math.round((p.loaded / p.total) * 100))
            }
          }
        })
        return classifier
      } catch (error) {
        // 某个源不通就换下一个，不要一次失败就永久降级
        lastError = error
      }
    }
    throw lastError || new Error('视觉模型加载失败')
  })()

  // 失败要能重试，否则一次网络抖动就永久降级
  loading.catch(() => {
    loading = null
    classifier = null
  })

  return loading
}

/**
 * 预热：进相机页就先把模型加载好（下载中的话会让下载提前开始），
 * 这样按快门时不用再等那一下。失败静默忽略，真正识别时还会再试。
 */
export function warmup() {
  loadClassifier().catch(() => {})
}

/**
 * 识别一张图。
 * @param {string} image 图片地址或 dataURL
 * @returns {Promise<object>} 与 mock 识别结果同结构
 */
export async function recognizeLocally(image, { onProgress } = {}) {
  const clf = await loadClassifier(onProgress)
  const scores = await clf(image, DISH_PROMPTS)
  if (!scores?.length) throw new Error('模型没有返回结果')

  const top = scores[0]
  const second = scores[1]
  const index = DISH_PROMPTS.indexOf(top.label)
  const dish = DISHES[index >= 0 ? index : DISHES.length - 1]

  // 概率是分到 20 个候选里的，20% 也已经是第一了；
  // 直接展示会显得很低，所以按「领先第二名多少」折算成更好理解的把握度
  const gap = second ? Math.max(0, (top.score - second.score) / (top.score || 1)) : 0.5
  const confidence = Math.max(35, Math.min(97, Math.round((0.5 + 0.5 * gap) * 100)))

  return {
    name: dish.cn,
    emoji: dish.emoji,
    meal: dish.meal,
    kcal: dish.kcal,
    weight: dish.weight,
    confidence,
    tag: dish.tag,
    note: '',
    nutrition: ['碳水', '蛋白质', '脂肪', '纤维', '糖', '盐'].map((label, i) => ({
      label,
      value: dish.nutrition[i],
      unit: 'g'
    })),
    dishId: dish.id,
    alternatives: scores.slice(1, 3).map((s) => ({
      name: DISHES[DISH_PROMPTS.indexOf(s.label)]?.cn || '其他',
      score: Math.round(s.score * 100)
    }))
  }
}
