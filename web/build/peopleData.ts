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
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'
import { parsePersonNode } from '../src/lib/parse'
import { dataDir, fetchWorkInfo, hasProfile, importPerson, listDataFiles } from './data'
import { enqueueJavbusFetch, javbusTasks, setJavbusBroadcast } from './fetchWorks'

const workspace = fileURLToPath(new URL('../..', import.meta.url))

const MANIFEST_ID = 'virtual:people-manifest'
const WORKS_ID = 'virtual:works-index'
const PERSON_PREFIX = 'virtual:person/'
const TSV_PREFIX = 'virtual:works-tsv/'
const DOWNLOAD_ID = 'virtual:download-set'
const DOWNLOAD_FILE = path.join(workspace, 'works-export', 'download.json')

export function peopleData(): Plugin {
  return {
    name: 'people-data',

    resolveId(id) {
      if (id === MANIFEST_ID || id === WORKS_ID) return '\0' + id
      if (id === DOWNLOAD_ID) return '\0' + id
      if (id.startsWith(PERSON_PREFIX)) return '\0' + id
      if (id.startsWith(TSV_PREFIX)) return '\0' + id
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
          hasProfile: hasProfile(person),
          aliases: (person.info['又名'] || '').split(/\s+/).filter(Boolean)
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

      /* ---- 单个演员的 JavBus 数据（按需加载 JSON） ---- */
      if (id.startsWith('\0' + TSV_PREFIX)) {
        const actorId = id.slice(1 + TSV_PREFIX.length)
        const jsonPath = path.join(workspace, 'works-export', `${actorId}.json`)
        if (fs.existsSync(jsonPath)) {
          const data = fs.readFileSync(jsonPath, 'utf-8')
          return `export default ${data};\n`
        }
        return `export default "";\n`
      }

      /* ---- 已下载番号集合（来自 works-export/download.json） ---- */
      if (id === '\0' + DOWNLOAD_ID) {
        // 解析失败时直接抛错，避免被 try/catch 静默吞掉导致「已下载 0」
        if (!fs.existsSync(DOWNLOAD_FILE)) {
          return 'export const downloadSet = new Set([]);\nexport const downloadNormSet = new Set([]);\n'
        }
        const raw = JSON.parse(fs.readFileSync(DOWNLOAD_FILE, 'utf-8'))
        const codes: string[] = raw && typeof raw === 'object' ? Object.keys(raw) : []
        // 归一化集合：小写 + 去 -_/空格，让 "heyzo-0783" 与 "HEYZO-0783" 等变体视为同一番号
        const norm = (s: string) => String(s).toLowerCase().replace(/[-_\s]/g, '')
        const normCodes = codes.map(norm)
        return `export const downloadSet = new Set(${JSON.stringify(codes)});\n` +
          `export const downloadNormSet = new Set(${JSON.stringify(normCodes)});\n`
      }
    },

    configureServer(server) {
      // JavBus 抓取任务进度 → WebSocket 推送给浏览器（替代轮询）
      setJavbusBroadcast(task => server.ws.send({ type: 'custom', event: 'javbus:task', data: { task } }))

      // chokidar 在 Windows 下对反斜杠 glob 支持差：目录用递归监视，glob 统一正斜杠
      server.watcher.add(dataDir)
      server.watcher.add(dataDir.split(path.sep).join('/') + '/**/*.html')
      // 监视 JavBus TSV 输出目录（仅用于热重载）
      const tsvDir = path.join(workspace, 'works-export')
      server.watcher.add(tsvDir)

      // 导入接口：从源站抓取人物页写入 data/（写文件后 watcher 自动刷新页面）
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/javbus-status') && req.method === 'GET') {
          // 前端轮询：JavBus 后台抓取任务进度（?actor= 只看某人物）
          const actor = new URL(req.url, 'http://localhost').searchParams.get('actor') || undefined
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: true, tasks: javbusTasks(actor || undefined) }))
          return
        }
        if (req.url?.startsWith('/api/work') && req.method === 'GET') {
          const code = new URL(req.url, 'http://localhost').searchParams.get('code') || ''
          res.setHeader('content-type', 'application/json; charset=utf-8')
          fetchWorkInfo(code.trim())
            .then(info => {
              if (info) res.end(JSON.stringify({ ok: true, ...info }))
              else { res.statusCode = 404; res.end(JSON.stringify({ ok: false, message: '未找到该番号' })) }
            })
            .catch(e => {
              res.statusCode = 502
              res.end(JSON.stringify({ ok: false, message: e instanceof Error ? e.message : String(e) }))
            })
          return
        }
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
            // 导入成功：后台自动抓取该人物的 JavBus 作品（不阻塞响应，完成后 works-export 监听自动刷新）
            const task = enqueueJavbusFetch(result.id)
            res.end(JSON.stringify({ ok: true, ...result, javbus: { started: task.status === 'running' } }))
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

      // 只响应 data/ 或 works-export/ 内的变动；其它（如 .cache）不触发整页刷新
      const isWatched = (file: string) =>
        file.startsWith(dataDir + path.sep) || file.startsWith(tsvDir + path.sep)
      const reload = (file?: string) => {
        if (file && !isWatched(file)) return
        for (const mod of [MANIFEST_ID, WORKS_ID]) {
          const m = server.moduleGraph.getModuleById('\0' + mod)
          if (m) server.moduleGraph.invalidateModule(m)
        }
        const dl = server.moduleGraph.getModuleById('\0' + DOWNLOAD_ID)
        if (dl) server.moduleGraph.invalidateModule(dl)
        for (const f of listDataFiles()) {
          const m = server.moduleGraph.getModuleById('\0' + PERSON_PREFIX + f.id)
          if (m) server.moduleGraph.invalidateModule(m)
          const t = server.moduleGraph.getModuleById('\0' + TSV_PREFIX + f.id)
          if (t) server.moduleGraph.invalidateModule(t)
        }
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
      server.watcher.on('change', reload)
    }
  }
}
