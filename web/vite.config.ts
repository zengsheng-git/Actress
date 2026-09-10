import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { parsePersonNode } from './src/lib/parse'

// web/        -> 本项目
// web/..      -> script/（工作区）
// script/data -> 原始人物页面 HTML（文件名即人物名）
const dirname = fileURLToPath(new URL('.', import.meta.url))
const workspace = fileURLToPath(new URL('..', import.meta.url))
const dataDir = path.join(workspace, 'data')

const MANIFEST_ID = 'virtual:people-manifest'
const WORKS_ID = 'virtual:works-index'
const PERSON_PREFIX = 'virtual:person/'

type DataFile = { rel: string; abs: string; id: string }

function listDataFiles(): DataFile[] {
  const out: DataFile[] = []
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.html?$/i.test(e.name)) {
        const rel = path.relative(dataDir, p).split(path.sep).join('/')
        out.push({ rel, abs: p, id: rel.replace(/\.html?$/i, '') })
      }
    }
  }
  walk(dataDir)
  return out
}

const hasProfile = (p: ReturnType<typeof parsePersonNode>) =>
  Boolean(p.avatar || p.photos.length || p.description || Object.keys(p.info).length)

/**
 * 构建期把 data/ 的 HTML 解析成结构化 JSON，通过虚拟模块暴露：
 *   - virtual:people-manifest：轻量清单（首页卡片用）+ loadPerson(id) 懒加载器
 *   - virtual:person/<id>    ：单人完整数据（按人物代码分割，点开详情才下载）
 *   - virtual:works-index    ：跨人物的全部记录（仅 /works 路由加载）
 * dev 下监听 data/ 变化，新增/修改文件无需重启。
 */
function peopleData(): Plugin {
  return {
    name: 'people-data',

    resolveId(id) {
      if (id === MANIFEST_ID || id === WORKS_ID) return '\0' + id
      if (id.startsWith(PERSON_PREFIX)) return '\0' + id
    },

    load(id) {
      /* ---- 人物清单 + 懒加载器 ---- */
      if (id === '\0' + MANIFEST_ID) {
        const files = listDataFiles()
        const parsed = files.map(f => ({
          file: f,
          person: parsePersonNode(fs.readFileSync(f.abs, 'utf-8'), f.id)
        }))
        parsed.sort((a, b) => a.person.name.localeCompare(b.person.name, 'zh'))

        const manifest = parsed.map(({ person }) => ({
          id: person.id,
          name: person.name,
          pid: person.pid,
          avatar: person.avatar,
          rows: person.rows.length,
          photos: person.photos.length,
          video: Boolean(person.video),
          hasProfile: hasProfile(person)
        }))
        const loaders = parsed
          .map(({ person }) => `  ${JSON.stringify(person.id)}: () => import(${JSON.stringify(PERSON_PREFIX + person.id)})`)
          .join(',\n')

        return `export const people = ${JSON.stringify(manifest)};\n` +
          `const loaders = {\n${loaders}\n};\n` +
          `export function loadPerson(id) {\n` +
          `  const l = loaders[id];\n` +
          `  return l ? l().then(m => m.default) : Promise.resolve(null);\n` +
          `}\n`
      }

      /* ---- 跨人物作品索引 ---- */
      if (id === '\0' + WORKS_ID) {
        const all: object[] = []
        for (const f of listDataFiles()) {
          const p = parsePersonNode(fs.readFileSync(f.abs, 'utf-8'), f.id)
          for (const r of p.rows) {
            all.push({ actorId: p.id, actorName: p.name, ...r })
          }
        }
        return `export default ${JSON.stringify(all)};\n`
      }

      /* ---- 单人完整数据 ---- */
      if (id.startsWith('\0' + PERSON_PREFIX)) {
        const pid = id.slice(1 + PERSON_PREFIX.length)
        const file = listDataFiles().find(f => f.id === pid)
        if (!file) return null
        const person = parsePersonNode(fs.readFileSync(file.abs, 'utf-8'), pid)
        return `export default ${JSON.stringify(person)};\n`
      }
    },

    configureServer(server) {
      // chokidar 在 Windows 下对反斜杠 glob 支持差：目录用递归监视，glob 统一正斜杠
      server.watcher.add(dataDir)
      server.watcher.add(dataDir.split(path.sep).join('/') + '/**/*.html')
      const reload = () => {
        for (const mod of [MANIFEST_ID, WORKS_ID]) {
          const m = server.moduleGraph.getModuleById('\0' + mod)
          if (m) server.moduleGraph.invalidateModule(m)
        }
        for (const f of listDataFiles()) {
          const m = server.moduleGraph.getModuleById('\0' + PERSON_PREFIX + f.id)
          if (m) server.moduleGraph.invalidateModule(m)
        }
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
      server.watcher.on('change', reload)
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), peopleData()],
  server: {
    host: true,
    port: 5173,
    fs: { allow: [dirname, workspace] }
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
