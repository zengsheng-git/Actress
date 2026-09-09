/**
 * 原始表格 HTML -> 结构化记录
 * 兼容列顺序变化：以表头「番号」所在列为基准取 4 列
 */

export function parseTable(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const grid = [...doc.querySelectorAll('tr')].map(tr =>
    [...tr.children].map(c => c.textContent.replace(/\s+/g, ' ').trim())
  )

  let idx = null
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

  const out = []
  for (const row of grid) {
    if (row.includes('番号')) continue
    if (Math.max(...idx) >= row.length) continue
    const rec = idx.map(i => row[i])
    if (!rec[0]) continue
    out.push(rec)
  }
  return out
}

/** "480分" / "120分钟" / "180 Min" -> 480 */
export function toMins(v) {
  const m = String(v).match(/\d+/)
  return m ? Number(m[0]) : 0
}

/** LAFBD-82 -> LAF-82，用于合并同一作品的 BD 版与非 BD 版 */
export function normCode(code) {
  return String(code).replace(/^([A-Za-z]+?)BD-/, '$1-')
}

export function toCsv(rows, withActor) {
  const head = withActor ? ['人物', '番号', '片长', '发行', '厂商'] : ['番号', '片长', '发行', '厂商']
  const body = rows.map(d =>
    withActor ? [d.actorName, d.code, d.len, d.date, d.maker] : [d.code, d.len, d.date, d.maker]
  )
  const csv = [head, ...body]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  return '\uFEFF' + csv
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
