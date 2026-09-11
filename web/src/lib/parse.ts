/**
 * 原始人物页面 HTML -> 结构化数据。
 * 浏览器（DOMParser）与 Node（正则，无 DOM 依赖）双实现，规则保持一致：
 *   1. 表格以表头「番号」所在列为基准取 4 列（番号/片长/发行/厂商）
 *   2. 资料区：img[itemprop=image] 头像、.info_team 的 label/span 键值对、
 *      p[itemprop=description] 介绍、.slideshow-container 照片、video>source 视频
 * 只有表格的文件：profile 字段全部为空，由界面回退处理。
 */

export interface WorkRow {
  code: string
  len: string
  date: string
  maker: string
  mins: number
  year: string
  norm: string
}

export interface PersonInfo {
  [label: string]: string
}

export interface PersonData {
  id: string
  name: string
  /** 文件名中的站点数字 ID，如 "35大桥未久" -> "35"；无则空串 */
  pid: string
  avatar: string
  info: PersonInfo
  description: string
  photos: string[]
  video: { src: string; poster: string } | null
  rows: WorkRow[]
}

/** "480分" / "120分钟" / "01:49:07" -> 分钟数 */
export function toMins(v: string): number {
  const s = String(v || '').trim()
  const hms = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (hms) return Number(hms[1]) * 60 + Number(hms[2])
  const m = s.match(/\d+/)
  return m ? Number(m[0]) : 0
}

/** LAFBD-82 -> LAF-82：合并同一作品的 BD 版与非 BD 版 */
export function normCode(code: string): string {
  return String(code).replace(/^([A-Za-z]+?)BD-/, '$1-')
}

function personName(id: string): string {
  return id.replace(/^\d+/, '').trim() || id
}

/** 清理从 HTML 提取的多行文本：软换行合并（CJK 之间不加空格）、空行分段 */
function tidyText(raw: string): string {
  const cjk = /[\u2E80-\u9FFF\u3040-\u30FF\uAC00-\uD7A3\uFF00-\uFFEF)\]》」』】，。、！？；：]/
  const paras: string[] = []
  let cur = ''
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) {
      if (cur) { paras.push(cur); cur = '' }
      continue
    }
    if (cur && !(cjk.test(cur.slice(-1)) || cjk.test(t[0]))) cur += ' '
    cur += t
  }
  if (cur) paras.push(cur)
  return paras.join('\n\n')
}

function buildPerson(id: string, parts: {
  avatar: string
  info: PersonInfo
  description: string
  photos: string[]
  videoSrc: string
  videoPoster: string
  tableRows: string[][]
}): PersonData {
  const rows: WorkRow[] = []
  for (const [code, len, date, maker] of parts.tableRows) {
    rows.push({
      code, len, date,
      maker: maker || '未标注',
      mins: toMins(len),
      year: String(date).slice(0, 4),
      norm: normCode(code)
    })
  }
  const pidMatch = id.match(/^(\d+)/)
  return {
    id,
    name: personName(id),
    pid: pidMatch ? pidMatch[1] : '',
    avatar: parts.avatar,
    info: parts.info,
    description: parts.description,
    photos: parts.photos,
    video: parts.videoSrc
      ? { src: parts.videoSrc, poster: parts.videoPoster }
      : null,
    rows
  }
}

/* ---------------- 浏览器实现：DOMParser ---------------- */

function parseWithDom(html: string, id: string): PersonData {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 头像
  const avatar = doc.querySelector('img[itemprop="image"]')?.getAttribute('src') || ''

  // 基础资料：.info_team 内 <label>xxx：</label><span>value</span> 成对出现
  const info: PersonInfo = {}
  const team = doc.querySelector('.info_team')
  if (team) {
    const labels = [...team.querySelectorAll('label')]
    for (const label of labels) {
      const key = label.textContent.replace(/\s+/g, ' ').replace(/：\s*$/, '').trim()
      // value = label 后第一个兄弟元素（通常是 span）
      let node = label.nextElementSibling
      let value = ''
      while (node && node.tagName === 'LABEL') node = node.nextElementSibling
      if (node) value = node.textContent.replace(/\s+/g, ' ').trim()
      if (key && value) info[key] = value
    }
  }

  // 介绍：<br> 转为换行，软换行由 tidyText 合并；innerHTML 路径需手动解码实体
  const descEl = doc.querySelector('p[itemprop="description"]')
  const description = descEl
    ? tidyText(
        descEl.innerHTML
          .replace(/<br\s*\/?>(\s*)/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
      )
    : ''

  // 照片：轮播图内所有 img
  const photos = [...doc.querySelectorAll('.slideshow-container img')]
    .map(i => i.getAttribute('src') || '')
    .filter(Boolean)

  // 视频
  const videoEl = doc.querySelector('video')
  const videoSrc = videoEl?.querySelector('source')?.getAttribute('src') || ''
  const videoPoster = videoEl?.getAttribute('poster') || ''

  // 表格：按表头「番号」定位基准列
  const grid = [...doc.querySelectorAll('tr')].map(tr =>
    [...tr.children].map(c => c.textContent.replace(/\s+/g, ' ').trim())
  )
  const tableRows = extractRows(grid)

  return buildPerson(id, { avatar, info, description, photos, videoSrc, videoPoster, tableRows })
}

/** 从二维文本网格中取 [番号, 片长, 发行, 厂商] 行（共享规则） */
function extractRows(grid: string[][]): string[][] {
  let idx: number[] | null = null
  for (const row of grid) {
    const i = row.indexOf('番号')
    if (i >= 0) { idx = [i, i + 1, i + 2, i + 3]; break }
  }
  if (!idx) {
    for (const row of grid) {
      if (row.length >= 5) { idx = [1, 2, 3, 4]; break }
      if (row.length === 4) { idx = [0, 1, 2, 3]; break }
    }
  }
  if (!idx) return []
  const out: string[][] = []
  for (const row of grid) {
    if (row.includes('番号')) continue
    if (Math.max(...idx) >= row.length) continue
    const rec = idx.map(i => row[i])
    if (!rec[0]) continue
    out.push(rec)
  }
  return out
}

/* ---------------- Node 实现：正则（供 vite 插件与 CLI 工具使用） ---------------- */

const esc = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')

function stripTags(html: string): string {
  return esc(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function parsePersonNode(html: string, id: string): PersonData {
  const pick = (re: RegExp): string => {
    const m = html.match(re)
    if (!m) return ''
    return (m.length > 1 ? m[1] : m[0]).trim()
  }

  const avatar = pick(/<img[^>]*itemprop="image"[^>]*src="([^"]+)"/i)
    || pick(/<img[^>]*src="([^"]+)"[^>]*itemprop="image"/i)

  // 基础资料：截取 .info_team 块，按 label 切分
  const info: PersonInfo = {}
  const teamBlock = pick(/<div[^>]*class="info_team"[^>]*>([\s\S]*?)<\/div>/i)
  if (teamBlock) {
    // 注意源码中可能出现 </label\n> 跨行闭合，标签结尾需容忍空白
    const pairs = teamBlock.match(/<label>([\s\S]*?)<\/label\s*>\s*<span[^>]*>([\s\S]*?)<\/span\s*>/gi) || []
    for (const p of pairs) {
      const m = p.match(/<label>([\s\S]*?)<\/label\s*>\s*<span[^>]*>([\s\S]*?)<\/span\s*>/i)
      if (!m) continue
      const key = stripTags(m[1]).replace(/：\s*$/, '').trim()
      const value = stripTags(m[2].replace(/<br\s*\/?>(\s*)/gi, ' '))
      if (key && value) info[key] = value
    }
  }

  // 介绍
  const descBlock = pick(/<p[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/p\s*>/i)
  const description = descBlock
    ? tidyText(
        esc(descBlock.replace(/<br\s*\/?>(\s*)/gi, '\n').replace(/<[^>]+>/g, ''))
      )
    : ''

  // 照片
  const slideBlock = pick(/<div[^>]*class="slideshow-container"[^>]*>([\s\S]*?)<\/div>\s*<(?:a|\/div)/i)
    || pick(/<div[^>]*class="slideshow-container"[^>]*>([\s\S]*?)<a\s+class="prev"/i)
  const photos = slideBlock
    ? [...slideBlock.matchAll(/<img[^>]*src="([^"]+)"/gi)].map(m => m[1])
    : []
  // 兜底：全文所有轮播图
  const allPhotos = photos.length
    ? photos
    : [...html.matchAll(/<div[^>]*class="mySlides[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/gi)].map(m => m[1])

  // 视频
  const videoBlock = pick(/<video[\s\S]*?<\/video>/i)
  const videoSrc = videoBlock ? pick(/<source[^>]*src="([^"]+)"/i) : ''
  const videoPoster = pick(/<video[^>]*poster="([^"]+)"/i)

  // 表格
  const grid: string[][] = []
  const trRe = /<tr[^>]*>([\s\S]*?)(?=<\/tr\s*>|<tr[\s>])/gi
  let tm
  while ((tm = trRe.exec(html))) {
    const cells: string[] = []
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cm
    while ((cm = cellRe.exec(tm[1]))) cells.push(stripTags(cm[1]))
    if (cells.length) grid.push(cells)
  }
  const tableRows = extractRows(grid)

  return buildPerson(id, {
    avatar, info, description,
    photos: allPhotos,
    videoSrc, videoPoster,
    tableRows
  })
}

/* ---------------- 统一入口 ---------------- */

export function parsePerson(html: string, id: string): PersonData {
  if (typeof DOMParser !== 'undefined') return parseWithDom(html, id)
  return parsePersonNode(html, id)
}
