/**
 * AI 服务配置（只在 dev server 里跑，不会打进前端包）
 *
 * ⚠️ key 不写在这里。它放在项目根目录的 `.env`（已被 .gitignore 排除），
 *    所以仓库公开 / 部署到 GitHub Pages 都不会把 key 带出去。
 *    新机器上想用 AI：
 *      1. 复制 `.env.example` 为 `.env`
 *      2. 把 AI_API_KEY 填上
 *    没填也不会报错，/api/ai 会返回 reason:'no-key'，前端自动降级成本地规则。
 *
 * ⚠️ 为什么整块用 getter 而不是直接取值：
 *    vite.config.js 里是 `import { aiServer } from './server/ai.js'`（顶层静态导入），
 *    它会在 `loadEnv()` 把 .env 灌进 process.env **之前**执行。
 *    如果写成 `apiKey: process.env.AI_API_KEY`，属性会被固化成这一刻的空串，
 *    之后设了 .env 也读不到（实测就是一直返回 no-key）。
 *    改成 getter 每次访问时重读 process.env，才能拿到 .env 里的值。
 *
 * 当前接的是 DeepSeek 官方 API（OpenAI 兼容）。注意它只有文本模型：
 * 实测传图片会返回 "Unsupported image prevents visual description"，
 * 所以「看图识别」走浏览器本地 CLIP，DeepSeek 负责的是「把数据说成人话」。
 */
const env = (name, fallback = '') => (process.env[name] || fallback).trim()
const envUrl = (name, fallback) => env(name, fallback).replace(/\/+$/, '')

export const AI = {
  get apiKey() {
    return env('AI_API_KEY')
  },
  get baseUrl() {
    return envUrl('AI_BASE_URL', 'https://api.deepseek.com')
  },
  /** deepseek-flash 快、够用；换 deepseek-v4-pro 更适合长推理 */
  get model() {
    return env('AI_MODEL', 'deepseek-flash')
  },

  /**
   * 可选：另配一个支持视觉的模型（qwen-vl-max / glm-4v-plus / gpt-4o-mini）
   * 配上之后 /api/recognize 就会真的看图，前端一行都不用改。
   */
  get visionBaseUrl() {
    return envUrl('AI_VISION_BASE_URL', '')
  },
  get visionKey() {
    return env('AI_VISION_KEY')
  },
  get visionModel() {
    return env('AI_VISION_MODEL')
  },

  /** 不联网跑通链路用 */
  get mock() {
    return env('AI_MOCK') === '1'
  },

  /**
   * 本地视觉模型（CLIP）的权重下载源。
   * huggingface.co 在国内基本连不上；hf-mirror.com 能下但没有 CORS 头，
   * 所以由 dev server 的 /api/model 代理转发。
   */
  get modelMirror() {
    return envUrl('AI_MODEL_MIRROR', 'https://hf-mirror.com')
  }
}
