import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { aiServer } from './server/ai.js'

// base 用相对路径，打包产物可直接双击 dist/index.html 打开（配合 hash 路由）
export default defineConfig(({ mode }) => {
  // 第三个参数传 ''：连没有 VITE_ 前缀的变量也读进来。
  // 读到的写回 process.env，server/aiConfig.js 里就能用环境变量覆盖写死的默认值。
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    base: './',
    plugins: [vue(), aiServer()],
    server: {
      host: true,
      port: 5173,
      open: false
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      chunkSizeWarningLimit: 900
    }
  }
})
