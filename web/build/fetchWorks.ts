/**
 * JavBus 作品抓取核心（CLI 与 dev server 共用）：
 * 1. 用本地番号采样反查该演员在 JavBus 的 star 页（仅定位手段）
 * 2. 翻页拉取 star 页的全部番号列表（有码区 + 无码区）——JavBus 收录多少就抓多少
 * 3. 逐番号抓详情页；详情缺失的记录字段留空照常写入
 *
 * fetchActorWorks(actorId, opts) 为纯抓取函数；
 * 任务注册表 TASKS 记录进度，由 dev server 的 /api/javbus-status 暴露给前端。
 */
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProxyAgent, fetch as ufetch } from 'undici'
import { javbusFetch, listDataFiles } from './data.ts'
import { detailFields } from './javbusDetail.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const workspace = path.resolve(here, '..', '..')

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const DELAY = 300
const norm = (s: unknown) => String(s || '').toLowerCase().replace(/[-_\s]/g, '')
const restoreDateCode = (s: string) => /^\d{6}\d{3}$/.test(s) ? s.slice(0, 6) + '_' + s.slice(6) : s
// 仅用于反查采样时优先无码区：明确的海外无码标志（日期式番号 + 无码站前缀），不用于数据标注
const UNCEN_HINT = /^(\d{6}_\d{3}|HEY|HEYZO|CARIB|LAFBD|MCBD|SKYHD|CWPBD)/i
const SAFE = (c: string) => c.replace(/[/\\:*?"<>|]/g, '_')

/* ---------- 任务注册表（dev server 展示进度用） ---------- */

export interface JavbusTask {
  actorId: string
  /** running | done | error */
  status: 'running' | 'done' | 'error'
  /** 当前阶段描述 */
  stage: string
  done: number
  total: number
  startedAt: number
  finishedAt?: number
  error?: string
}

const TASKS = new Map<string, JavbusTask>()

/** 进度广播函数（dev server 注入 Vite WebSocket，把任务变更推给浏览器）；CLI 模式下为空 */
let broadcast: ((task: JavbusTask) => void) | null = null
export function setJavbusBroadcast(fn: (task: JavbusTask) => void) { broadcast = fn }

const notify = (task: JavbusTask) => {
  try { broadcast?.(task) } catch { /* 广播失败不影响抓取 */ }
}

/** 查询任务状态（前端轮询用）；runningOnly 时只返回进行中的 */
export function javbusTasks(actorId?: string): JavbusTask[] {
  const all = [...TASKS.values()].sort((a, b) => b.startedAt - a.startedAt)
  return actorId ? all.filter(t => t.actorId === actorId) : all
}

/** dev server 里串行执行，避免与用户手跑的 CLI 叠加触发风控 */
let chain: Promise<unknown> = Promise.resolve()

export function enqueueJavbusFetch(actorId: string): JavbusTask {
  const exist = TASKS.get(actorId)
  if (exist && (exist.status === 'running' || Date.now() - (exist.finishedAt ?? 0) < 60_000)) return exist
  const task: JavbusTask = {
    actorId, status: 'running', stage: '排队中', done: 0, total: 0, startedAt: Date.now()
  }
  TASKS.set(actorId, task)
  notify(task)
  chain = chain.then(() => fetchActorWorks(actorId, {
    onProgress: p => {
      if (p.stage) task.stage = p.stage
      if (p.done != null) task.done = p.done
      if (p.total != null) task.total = p.total
      notify(task)
    }
  })).then(summary => {
    task.status = 'done'
    task.stage = summary
    task.finishedAt = Date.now()
    notify(task)
  }).catch(e => {
    task.status = 'error'
    task.stage = '抓取失败'
    task.error = e instanceof Error ? e.message : String(e)
    task.finishedAt = Date.now()
    notify(task)
  })
  return task
}

/* ---------- 代理 + 抓取 ---------- */

let dispatcher: ProxyAgent | null = null
async function getDispatcher() {
  if (dispatcher) return dispatcher
  if (process.env.JAVDB_PROXY) { dispatcher = new ProxyAgent(process.env.JAVDB_PROXY); return dispatcher }
  for (const port of [7890, 7897, 10809, 10808]) {
    const ok = await new Promise<boolean>(resolve => {
      const s = net.connect({ host: '127.0.0.1', port, timeout: 500 })
      s.on('connect', () => { s.end(); resolve(true) })
      s.on('error', () => resolve(false))
      s.on('timeout', () => { s.destroy(); resolve(false) })
    })
    if (ok) { dispatcher = new ProxyAgent(`http://127.0.0.1:${port}`); return dispatcher }
  }
  throw new Error('未找到可用的本地代理（7890/7897/10809/10808 都不通）')
}

async function downloadCover(remoteUrl: string, dest: string) {
  if (!remoteUrl) return
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return // 已有
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const d = await getDispatcher()
      const r = await ufetch(remoteUrl, {
        dispatcher: d,
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'accept-language': 'zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7',
          'referer': 'https://www.javbus.com/'
        },
        signal: AbortSignal.timeout(20000)
      })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 1024) throw new Error('too small')
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, buf)
      return
    } catch {
      if (attempt < 3) await sleep(500 + Math.random() * 500)
    }
  }
  // 3 次都失败就放弃（主流程不中断）
}

/* ---------- star 页作品列表 ---------- */

function starPageWorks(html: string, section: 'censored' | 'uncensored'): { section: 'censored' | 'uncensored'; code: string }[] {
  const out: { section: 'censored' | 'uncensored'; code: string }[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/movie-box" href="https:\/\/www\.javbus\.com\/([A-Za-z0-9_-]+)"/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); out.push({ section, code: m[1] }) }
  }
  return out
}

function lastPage(html: string, section: string, starId: string): number {
  let max = 1
  const re = new RegExp(`/${section === 'uncensored' ? 'uncensored/' : ''}star/${starId}/(\\d+)`, 'g')
  for (const m of html.matchAll(re)) max = Math.max(max, Number(m[1]))
  return max
}

async function fetchStarCodes(section: 'censored' | 'uncensored', starId: string) {
  const first = await javbusFetch(`/${section === 'uncensored' ? 'uncensored/' : ''}star/${starId}`)
  const total = lastPage(first, section, starId)
  const all = starPageWorks(first, section)
  for (let p = 2; p <= total; p++) {
    await sleep(DELAY)
    const html = await javbusFetch(`/${section === 'uncensored' ? 'uncensored/' : ''}star/${starId}/${p}`)
    all.push(...starPageWorks(html, section))
  }
  return all
}

/* ---------- 反查 star id（仅定位手段：采样番号 → 详情页出演者链接投票） ---------- */

async function resolveStars(codes: string[]): Promise<{ section: 'censored' | 'uncensored'; id: string }[]> {
  const votes = new Map<string, { section: 'censored' | 'uncensored'; id: string; n: number }>()
  const weak = new Map<string, { section: 'censored' | 'uncensored'; id: string; n: number }>()
  const uncenFirst = codes.filter(c => UNCEN_HINT.test(c))
  const step = Math.max(1, Math.floor(codes.length / 20))
  const uniform: string[] = []
  for (let i = 0; i < codes.length && uniform.length < 20; i += step) uniform.push(codes[i])
  const sample = [...new Set([...uncenFirst.slice(0, 10), ...uniform])].slice(0, 30)
  for (const code of sample) {
    try {
      const html = await javbusFetch('/' + encodeURIComponent(code))
      for (const m of html.matchAll(/href="https:\/\/www\.javbus\.com\/(uncensored\/)?star\/([a-zA-Z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        const key = (m[1] ? 'uncensored:' : 'censored:') + m[2]
        const cur = (m[3].trim() ? votes : weak).get(key) || { section: (m[1] ? 'uncensored' : 'censored') as 'censored' | 'uncensored', id: m[2], n: 0 }
        cur.n++
        ;(m[3].trim() ? votes : weak).set(key, cur)
      }
    } catch { /* 跳过 */ }
    await sleep(DELAY)
  }
  const winners: { section: 'censored' | 'uncensored'; id: string }[] = []
  for (const section of ['censored', 'uncensored'] as const) {
    let best: { section: 'censored' | 'uncensored'; id: string; n: number } | null = null
    const pool = [...votes.values()].filter(v => v.section === section)
    const weakPool = [...weak.values()].filter(v => v.section === section)
    for (const v of pool) if (!best || v.n > best.n) best = v
    if (!best) for (const v of weakPool) if (!best || v.n > best.n) best = v
    if (best) winners.push({ section, id: best.id })
  }
  return winners
}

/* ---------- 详情页抓取 ---------- */

export interface WorkRecord {
  code: string
  section: 'censored' | 'uncensored'
  date: string
  mins: number
  studio: string
  series: string
  cover: string  // 相对路径如 "covers/censored/MIZD-972.jpg"
  coverRemote: string
  title: string
}

/** star 页番号直查详情页；详情缺失返回 null（调用方决定如何落盘） */
async function fetchWorkFull(section: 'censored' | 'uncensored', code: string, withCovers: boolean): Promise<WorkRecord | null> {
  let html: string
  try {
    html = await javbusFetch('/' + encodeURIComponent(code))
  } catch {
    return null
  }
  if (!html.includes('bigImage') && !html.includes('影片') || /404|抱歉|not found/i.test(html)) {
    return null
  }
  const d = detailFields(html)
  const rec: WorkRecord = {
    code, section,
    date: d.date, mins: d.mins, studio: d.studio, series: d.series,
    cover: '', coverRemote: '',
    title: html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]?.replace(/<[^>]+>/g, '').trim()
      || html.match(/<title>\s*([^<-]+)/)?.[1]?.trim()
      || ''
  }
  const cover = html.match(/<a class="bigImage" href="([^"]+)"/)?.[1] ?? ''
  rec.coverRemote = cover ? (cover.startsWith('http') ? cover : 'https://www.javbus.com' + cover) : ''
  if (rec.coverRemote && withCovers) {
    const relPath = `covers/${section}/${SAFE(code)}.jpg`
    rec.cover = relPath
    const absPath = path.join(workspace, relPath)
    // 串行下载（4 并发容易触发 JavBus CDN 风控）
    coverQueue.push(() => downloadCover(rec.coverRemote, absPath))
  }
  return rec
}

/** 串行下载队列 */
const coverQueue: (() => Promise<void>)[] = []

/* ---------- 主流程 ---------- */

export interface FetchProgress { stage?: string; done?: number; total?: number }
export type FetchProgressCb = (p: FetchProgress) => void

/** 抓取单个人物的全部 JavBus 作品并写入 works-export/<id>.json */
export async function fetchActorWorks(actorId: string, opts: {
  covers?: boolean
  outDir?: string
  onProgress?: FetchProgressCb
} = {}): Promise<string> {
  const { covers = false, outDir = path.join(workspace, 'works-export'), onProgress = () => {} } = opts
  const file = listDataFiles().find(f => f.id === actorId)
  if (!file) throw new Error(`${actorId}：data/ 下无此人物`)

  // 本地番号唯一用途：采样反查 star id
  onProgress({ stage: '读取本地番号' })
  const original = fs.readFileSync(file.abs, 'utf-8')
  const localCodes = [...original.matchAll(/<td>([A-Za-z0-9_-]+)<\/td>/g)]
    .map(m => restoreDateCode(m[1]))
    .filter(c => /[A-Za-z]/.test(c) && /\d/.test(c))
  if (!localCodes.length) throw new Error(`${actorId}：本地表为空，无法反查 star`)

  onProgress({ stage: `反查 star（采样 ${Math.min(30, localCodes.length)} 个番号）`, done: 0, total: Math.min(30, localCodes.length) })
  const stars = await resolveStars(localCodes)
  if (!stars.length) throw new Error(`${actorId}：采样 30 个番号都查不到 JavBus star`)

  // star 页全量番号 = JavBus 的口径，本地表不再参与
  const byCode = new Map<string, { section: 'censored' | 'uncensored'; code: string }>()
  for (const s of stars) {
    onProgress({ stage: `拉取 star 页列表（${s.section === 'uncensored' ? '无码' : '有码'}区）` })
    for (const r of await fetchStarCodes(s.section, s.id)) {
      const k = norm(r.code)
      if (!byCode.has(k)) byCode.set(k, r)
    }
    await sleep(DELAY)
  }
  if (!byCode.size) throw new Error(`${actorId}：star 页无作品`)

  const arr = [...byCode.values()]
  const records: WorkRecord[] = []
  let i = 0
  let missing = 0
  onProgress({ stage: '抓取详情页', done: 0, total: arr.length })
  let report = 0
  async function worker() {
    while (i < arr.length) {
      const idx = i++
      const rec = await fetchWorkFull(arr[idx].section, arr[idx].code, covers)
      if (rec) {
        if (!covers) rec.cover = '' // 不下载封面：留空路径
        records[idx] = rec
      } else {
        // star 页列出的番号也是 JavBus 数据：详情缺失只字段留空，记录照常写入
        missing++
        records[idx] = { code: arr[idx].code, section: arr[idx].section, date: '', mins: 0, studio: '', series: '', cover: '', coverRemote: '', title: '' }
      }
      if (++report % 10 === 0 || i >= arr.length) onProgress({ stage: '抓取详情页', done: i, total: arr.length })
      await sleep(DELAY)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  if (covers && coverQueue.length) {
    onProgress({ stage: '下载封面', done: 0, total: coverQueue.length })
    let cd = 0
    while (coverQueue.length) {
      const t = coverQueue.shift()
      if (t) await t()
      if (++cd % 10 === 0 || !coverQueue.length) onProgress({ stage: '下载封面', done: cd, total: records.filter(r => r.cover).length })
    }
  }
  const rows = records.filter(Boolean).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))

  // 输出纯 JavBus JSON：无跨站对比统计；详情缺失的记录字段留空
  fs.mkdirSync(outDir, { recursive: true })
  const counts = {
    total: rows.length,
    censored: rows.filter(r => r.section === 'censored').length,
    uncensored: rows.filter(r => r.section === 'uncensored').length
  }
  const result = { actorId: file.id, name: file.id.replace(/^\d+/, ''), counts, works: rows }
  const out = path.join(outDir, `${actorId}.json`)
  fs.writeFileSync(out, JSON.stringify(result, null, 2), 'utf-8')
  return `${actorId}：star 页列 ${arr.length} 部，全部写入（详情完整 ${rows.length - missing}，缺失 ${missing} 部字段留空）`
}

/* ---------- 仅 CLI 模式：作为入口（tools/fetch-works.ts 或本文件直跑）被执行时才走这里 ---------- */

const isCliEntry = Boolean(
  process.argv[1] && /fetch-works\.ts$|fetchWorks\.ts$/.test(process.argv[1])
)
if (isCliEntry) {
  const args = process.argv.slice(2)
  const has = (flag: string) => args.includes(flag)
  const flagValue = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null
  }
  const outDir = path.resolve(flagValue('--out') || path.join(workspace, 'works-export'))
  const coverMode = has('--covers')
  const coverOnly = has('--covers-only')
  const outIdx = args.indexOf('--out')
  const targets = has('--all') ? listDataFiles().map(f => f.id) : args.filter((a, i) => !a.startsWith('--') && i !== outIdx + 1)

  if (!coverOnly && !targets.length) {
    console.error('用法: node --experimental-strip-types tools/fetch-works.ts <人物ID...|--all> [--covers] [--covers-only] [--out 目录]')
    process.exit(1)
  }

  let fail = 0
  const runOne = async (id: string) => {
    try {
      if (coverOnly) {
        // 只补封面：读已有 JSON，缺的封面串行补下
        const jsonPath = path.join(outDir, `${id}.json`)
        if (!fs.existsSync(jsonPath)) throw new Error(`找不到 ${jsonPath}`)
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as { works: WorkRecord[] }
        const queue: (() => Promise<void>)[] = []
        for (const w of data.works) {
          if (!w.coverRemote) continue
          const abs = path.join(workspace, w.cover)
          if (fs.existsSync(abs)) continue
          queue.push(() => downloadCover(w.coverRemote, abs))
        }
        for (const task of queue) await task()
        console.log(`✓ ${id}：补下 ${queue.length} 张封面`)
        return
      }
      console.log('… ' + id)
      const summary = await fetchActorWorks(id, { covers: coverMode, outDir })
      console.log('✓ ' + summary)
    } catch (e) {
      fail++
      console.error(`✗ ${id}：${e instanceof Error ? e.message : e}`)
    }
  }
  for (const id of targets) await runOne(id)
  console.log(`完成：${targets.length - fail}/${targets.length} 成功，输出目录 ${outDir}`)
  process.exit(fail ? 1 : 0)
}
