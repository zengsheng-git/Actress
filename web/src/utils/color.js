/** 由字符串稳定生成一组柔和配色（同一名称每次颜色一致） */

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

/** 厂商标签：浅底 + 深字 + 描边 */
export function makerStyle(name) {
  const h = hash(name || '')
  return {
    background: `hsl(${h} 72% 95%)`,
    color: `hsl(${h} 52% 34%)`,
    borderColor: `hsl(${h} 60% 87%)`
  }
}

/** 厂商小圆点：中等饱和度，用于在筛选标签前做色标 */
export function dotColor(name) {
  const h = hash(name || '')
  return `hsl(${h} 62% 56%)`
}

/** 人物头像色块：渐变底 + 白字 */
export function avatarStyle(name) {
  const h = hash(name || '')
  return { background: `linear-gradient(135deg, hsl(${h} 68% 62%), hsl(${(h + 28) % 360} 72% 52%))` }
}

/** 跳过前导数字后，取第一个中日韩字符；纯英文取首字母大写 */
export function initial(name) {
  const s = String(name || '').replace(/^\d+/, '').trim()
  if (!s) return '?'
  const cjk = s.match(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/)
  if (cjk) return cjk[0]
  const en = s.match(/[A-Za-z]/)
  if (en) return en[0].toUpperCase()
  return s.charAt(0)
}
