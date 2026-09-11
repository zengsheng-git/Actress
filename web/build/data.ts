/**
 * 数据目录扫描与源站抓取。
 * 工作区约定：web/ 本项目，web/.. 为 script/，script/data 为原始人物页面 HTML。
 */
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { fileURLToPath, URL } from 'node:url'
import { ProxyAgent, Agent, fetch as ufetch } from 'undici'
import { parsePersonNode } from '../src/lib/parse.ts'

const workspace = fileURLToPath(new URL('../..', import.meta.url))
export const dataDir = path.join(workspace, 'data')

export interface DataFile {
  /** 相对 data/ 的路径（正斜杠） */
  rel: string
  /** 绝对路径 */
  abs: string
  /** 文件名去扩展名，即人物 ID（如 "35大桥未久"） */
  id: string
}

/** 递归收集 data/ 下所有 html */
export function listDataFiles(): DataFile[] {
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

export function hasProfile(p: ReturnType<typeof parsePersonNode>) {
  return Boolean(p.avatar || p.photos.length || p.description || Object.keys(p.info).length)
}

const SOURCE_SITE = 'https://www.fouroursonsinc.com/person/'

/* ---------------- JavDB 番号封面/详情（经本机代理） ---------------- */

const JAVDB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const PROXY_PORTS = [7890, 7897, 10809, 10808]

let dispatcher: ProxyAgent | Agent | null = null

/** 探测本机代理端口（环境变量 JAVDB_PROXY 优先），找不到则直连兜底 */
async function getDispatcher(): Promise<ProxyAgent | Agent> {
  if (dispatcher) return dispatcher
  if (process.env.JAVDB_PROXY) {
    dispatcher = new ProxyAgent(process.env.JAVDB_PROXY)
    return dispatcher
  }
  for (const port of PROXY_PORTS) {
    const open = await new Promise<boolean>(resolve => {
      const s = net.connect({ host: '127.0.0.1', port, timeout: 500 })
      s.on('connect', () => { s.end(); resolve(true) })
      s.on('error', () => resolve(false))
      s.on('timeout', () => { s.destroy(); resolve(false) })
    })
    if (open) {
      dispatcher = new ProxyAgent(`http://127.0.0.1:${port}`)
      return dispatcher
    }
  }
  dispatcher = new Agent()
  return dispatcher
}

async function javdbFetch(pathname: string): Promise<string> {
  const d = await getDispatcher()
  const r = await ufetch('https://javdb.com' + pathname, {
    dispatcher: d,
    headers: { 'user-agent': JAVDB_UA, 'accept-language': 'zh-CN' },
    signal: AbortSignal.timeout(20000)
  })
  if (!r.ok) throw new Error(`JavDB HTTP ${r.status}`)
  return r.text()
}

/** 同一代理池抓 JavBus（直连番号即详情页，无需登录，无需搜索） */
export async function javbusFetch(pathname: string): Promise<string> {
  const d = await getDispatcher()
  const r = await ufetch('https://www.javbus.com' + pathname, {
    dispatcher: d,
    headers: { 'user-agent': JAVDB_UA, 'accept-language': 'zh-CN' },
    signal: AbortSignal.timeout(20000)
  })
  if (!r.ok) throw new Error(`JavBus HTTP ${r.status}`)
  return r.text()
}

export interface WorkInfo {
  cover: string
  url: string
  title: string
  /** 封面来源站：javbus 直连番号；javdb 搜索匹配 */
  source?: 'javbus' | 'javdb'
}

const cacheDir = path.join(workspace, 'web', '.cache')
const workCacheFile = path.join(cacheDir, 'work-info.json')
const CACHE_TTL = 30 * 24 * 3600 * 1000 // 番号封面 30 天不变，缓存一个月

function readWorkCache(): Record<string, WorkInfo & { ts: number }> {
  try {
    return JSON.parse(fs.readFileSync(workCacheFile, 'utf-8'))
  } catch {
    return {}
  }
}

/** JavBus：直连番号详情页，一步拿封面，无登录 */
async function fromJavBus(code: string): Promise<WorkInfo | null> {
  const html = await javbusFetch(`/${encodeURIComponent(code)}`)
  const coverM = html.match(/<a class="bigImage" href="([^"]+)"/)
  if (!coverM) return null
  const title =
    html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
    html.match(/<title>\s*([^<|]+)/)?.[1]?.trim() ||
    ''
  return {
    cover: new URL(coverM[1] ?? '', 'https://www.javbus.com').href,
    url: 'https://www.javbus.com/' + encodeURIComponent(code),
    title,
    source: 'javbus' as const
  }
}

/** JavDB：搜索第一条详情页，部分条目需登录才能看全 */
async function fromJavDB(code: string): Promise<WorkInfo | null> {
  const search = await javdbFetch(`/search?q=${encodeURIComponent(code)}`)
  const m = search.match(/href="(\/v\/[A-Za-z0-9]+)"/)
  if (!m) return null
  const url = 'https://javdb.com' + m[1]
  const detail = await javdbFetch(m[1])
  const cover =
    detail.match(/<img[^>]+class="video-cover"[^>]+src="([^"]+)"/)?.[1] ??
    detail.match(/src="(https:\/\/c0\.jdbstatic\.com\/covers\/[^"]+)"/)?.[1] ??
    ''
  const title =
    detail.match(/<meta property="og:title" content="([^"]+)"/)?.[1]?.trim() ||
    detail.match(/<title>\s*([^<|]+)/)?.[1]?.trim() ||
    ''
  return { cover, url, title, source: 'javdb' }
}

/** 按番号查封面/详情：JavBus 优先（直连无登录），JavDB 兜底 */
export async function fetchWorkInfo(code: string): Promise<WorkInfo | null> {
  const cache = readWorkCache()
  const hit = cache[code]
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return { cover: hit.cover, url: hit.url, title: hit.title, source: hit.source }
  }
  let info: WorkInfo | null = null
  try { info = await fromJavBus(code) } catch { /* 换 JavDB 兜底 */ }
  if (!info) {
    try { info = await fromJavDB(code) } catch { /* 两源都失败 */ }
  }
  if (!info) return null
  cache[code] = { ...info, ts: Date.now() }
  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(workCacheFile, JSON.stringify(cache))
  return info
}

/** 抓取源站人物页，校验结构后写入 data/，返回解析摘要 */
export async function importPerson(id: string) {
  const resp = await fetch(SOURCE_SITE + encodeURIComponent(id), {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(20000)
  })
  if (!resp.ok) throw new Error(`源站返回 HTTP ${resp.status}`)
  const html = await resp.text()
  if (!/<img[^>]*itemprop="image"/i.test(html) || !html.includes('番号')) {
    throw new Error('页面结构不符（该 ID 可能不存在）')
  }
  const titleM = html.match(/<title>([^<]*)<\/title>/i)
  const rawName = ((titleM?.[1]) ?? '').split(/[（(]/)[0]?.trim() ?? ''
  if (!rawName) throw new Error('无法从页面标题提取人物名')
  const name = rawName.replace(/[\\/:*?"<>|\s]+/g, '')
  const pid = `${id}${name}`
  fs.writeFileSync(path.join(dataDir, `${pid}.html`), html, 'utf-8')
  const person = parsePersonNode(html, pid)
  return { id: pid, name, rows: person.rows.length, hasProfile: hasProfile(person) }
}
