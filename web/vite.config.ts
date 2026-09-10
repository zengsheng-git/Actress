import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { peopleData } from './build/peopleData'

// web/        -> 本项目
// web/..      -> script/（工作区，data/ 原始人物页见 build/data.ts）
const dirname = fileURLToPath(new URL('.', import.meta.url))
const workspace = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), peopleData()],
  server: {
    host: true,
    port: 5173,
    fs: { allow: [dirname, workspace] },
    watch: {
      // 番号封面缓存写入不应触发页面刷新
      ignored: ['**/.cache/**']
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    },
    chunkSizeWarningLimit: 900
  }
})
