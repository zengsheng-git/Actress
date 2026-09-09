import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

// web/        -> 本项目
// web/..      -> script/（工作区）
// script/data -> 原始表格数据
const dirname = fileURLToPath(new URL('.', import.meta.url))
const workspace = fileURLToPath(new URL('..', import.meta.url))
const dataDir = path.join(workspace, 'data')

const VIRTUAL_ID = 'virtual:data-files'
const RESOLVED_ID = '\0' + VIRTUAL_ID

function listDataFiles() {
  const out = []
  const walk = dir => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.html?$/i.test(e.name)) {
        out.push([path.relative(dataDir, p).split(path.sep).join('/'), p])
      }
    }
  }
  walk(dataDir)
  return out
}

/**
 * 把 data/ 下的所有 html 作为虚拟模块暴露：
 *   import files from 'virtual:data-files'  // { '相对路径': 'html 原文' }
 * dev 下每次失效都会重新读目录，新增文件无需重启 dev server。
 */
function dataFiles() {
  return {
    name: 'data-files',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id !== RESOLVED_ID) return null
      const entries = listDataFiles().map(
        ([rel, abs]) => `${JSON.stringify(rel)}: ${JSON.stringify(fs.readFileSync(abs, 'utf-8'))}`
      )
      return `export default {${entries.join(',\n')}};\n`
    },

    configureServer(server) {
      server.watcher.add(dataDir)
      server.watcher.add(path.join(dataDir, '**', '*.html'))

      const reload = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
      server.watcher.on('change', reload)
    }
  }
}

export default defineConfig({
  plugins: [vue(), dataFiles()],
  server: {
    host: true,
    port: 5173,
    fs: { allow: [dirname, workspace] }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 数据量大，单独分包：改代码时不会让几百 KB 的数据重新下载
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('virtual:data-files')) return 'data'
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    },
    chunkSizeWarningLimit: 900
  }
})
