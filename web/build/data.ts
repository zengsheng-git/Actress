/**
 * 数据目录扫描与源站抓取。
 * 工作区约定：web/ 本项目，web/.. 为 script/，script/data 为原始人物页面 HTML。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { parsePersonNode } from '../src/lib/parse'

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
  const rawName = (titleM ? titleM[1] : '').split(/[（(]/)[0].trim()
  if (!rawName) throw new Error('无法从页面标题提取人物名')
  const name = rawName.replace(/[\\/:*?"<>|\s]+/g, '')
  const pid = `${id}${name}`
  fs.writeFileSync(path.join(dataDir, `${pid}.html`), html, 'utf-8')
  const person = parsePersonNode(html, pid)
  return { id: pid, name, rows: person.rows.length, hasProfile: hasProfile(person) }
}
