/**
 * 构建期把 data/ 的 HTML 解析成结构化 JSON，通过虚拟模块暴露：
 *   - virtual:people-manifest：轻量清单（首页卡片用）+ loadPerson(id) 懒加载器
 *   - virtual:person/<id>    ：单人完整数据（按人物代码分割，点开详情才下载）
 *   - virtual:works-index    ：跨人物的全部记录（仅 /works 路由加载）
 * dev 下监听 data/ 变化，新增/修改文件无需重启；
 * 并提供 POST /api/import 从源站抓取人物页写入 data/。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { parsePersonNode } from '../src/lib/parse'
import { dataDir, hasProfile, importPerson, listDataFiles } from './data'

const MANIFEST_ID = 'virtual:people-manifest'
const WORKS_ID = 'virtual:works-index'
const PERSON_PREFIX = 'virtual:person/'

export function peopleData(): Plugin {
  return {
    name: 'people-data',

    resolveId(id) {
      if (id === MANIFEST_ID || id === WORKS_ID) return '\0' + id
      if (id.startsWith(PERSON_PREFIX)) return '\0' + id
    },

    load(id) {
      /* ---- 人物清单 + 懒加载器 ---- */
      if (id === '\0' + MANIFEST_ID) {
        const parsed = listDataFiles().map(f => ({
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

      // 导入接口：从源站抓取人物页写入 data/（写文件后 watcher 自动刷新页面）
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/import' || req.method !== 'POST') return next()
        let body = ''
        req.on('data', c => {
          body += c
          if (body.length > 4096) req.destroy()
        })
        req.on('end', async () => {
          res.setHeader('content-type', 'application/json; charset=utf-8')
          try {
            const parsed = JSON.parse(body || '{}')
            const pid = String(parsed.id ?? '').match(/(\d+)/)?.[1]
            if (!pid) throw new Error('请提供人物 ID（数字）或人物页链接')
            const result = await importPerson(pid)
            res.end(JSON.stringify({ ok: true, ...result }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, message: e instanceof Error ? e.message : String(e) }))
          }
        })
        req.on('error', () => {
          res.statusCode = 400
          res.end(JSON.stringify({ ok: false, message: '请求解析失败' }))
        })
      })

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
