import type { WorkRow } from './parse'

/** 通用筛选条件（人物详情页和全部作品页共用） */
export interface Filter {
  makers: string[]      // 空 = 全部
  kw: string
  year: string          // 空 = 全部
  minLen: number        // 0 = 全部
  mergeBD: boolean
}

export type SortKey = 'date' | 'code' | 'mins' | 'maker' | 'actor'
export type SortDir = 1 | -1

/** 搜索归一化：小写 + 去横线/下划线/空格，让 "KSB-117" 能命中 "ksbj117" 这类番号变体 */
export function normSearch(s: string): string {
  return String(s || '').toLowerCase().replace(/[-_\s]/g, '')
}

export function applyFilters<T extends WorkRow>(rows: T[], f: Filter): T[] {
  const kw = normSearch(f.kw)
  let out = rows.filter(r =>
    (!f.makers.length || f.makers.includes(r.maker)) &&
    (!f.year || r.year === f.year) &&
    r.mins >= Number(f.minLen) &&
    (!kw || normSearch(r.code).includes(kw) || normSearch(r.maker).includes(kw))
  )
  if (f.mergeBD) out = mergeBdRows(out)
  return out
}

/** 同一作品的 BD 版与非 BD 版只保留非 BD 那条 */
function mergeBdRows<T extends WorkRow>(rows: T[]): T[] {
  const map = new Map<string, T>()
  for (const r of rows) {
    const actorId = (r as unknown as { actorId?: string }).actorId
    const k = actorId ? actorId + '|' + r.norm : r.norm
    const old = map.get(k)
    if (!old) map.set(k, r)
    else if (old.code.includes('BD') && !r.code.includes('BD')) map.set(k, r)
  }
  return [...map.values()]
}

export function sortRows<T extends WorkRow>(rows: T[], key: SortKey, dir: SortDir): T[] {
  return rows.slice().sort((a, b) => {
    const r = key === 'mins'
      ? a.mins - b.mins
      : key === 'actor'
        ? String((a as { actorName?: string }).actorName || '').localeCompare(String((b as { actorName?: string }).actorName || ''), 'zh')
        : String(a[key]).localeCompare(String(b[key]), 'ja')
    return r * dir
  })
}

export function makerCounts<T extends WorkRow>(rows: T[]): [string, number][] {
  const cnt = new Map<string, number>()
  for (const r of rows) cnt.set(r.maker, (cnt.get(r.maker) || 0) + 1)
  return [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
}

export function yearCounts<T extends WorkRow>(rows: T[]): [string, number][] {
  const cnt = new Map<string, number>()
  for (const r of rows) if (r.year) cnt.set(r.year, (cnt.get(r.year) || 0) + 1)
  return [...cnt.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

/** 可排序列的表头箭头 */
export function sortArrow(active: boolean, dir: SortDir): string {
  return active ? (dir > 0 ? ' ▲' : ' ▼') : ''
}

/** 分钟数 → 可读时长：>=120 分钟显示小时，否则显示分钟 */
export function fmtMins(mins: number): string {
  return mins >= 120 ? (mins / 60).toFixed(1) + ' 小时' : Math.round(mins) + ' 分钟'
}

export function toCsv(rows: (WorkRow & { actorName?: string })[], withActor: boolean): string {
  const head = withActor ? ['人物', '番号', '片长', '发行', '厂商'] : ['番号', '片长', '发行', '厂商']
  const body = rows.map(d =>
    withActor
      ? [d.actorName, d.code, d.len, d.date, d.maker]
      : [d.code, d.len, d.date, d.maker]
  )
  const csv = [head, ...body]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  return '﻿' + csv
}

export function download(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
