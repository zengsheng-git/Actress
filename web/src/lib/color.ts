/** 由字符串稳定生成柔和配色（同一名称每次颜色一致），用于深色主题的厂商标签/圆点/头像 */

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

export function makerBadgeStyle(name: string) {
  const h = hash(name || '')
  // 明度走 CSS 变量：深色主题为深底浅字，浅色主题为浅底深字，切换主题无需重渲染
  return {
    background: `hsl(${h} var(--maker-s) var(--maker-bg))`,
    color: `hsl(${h} calc(var(--maker-s) + 20%) var(--maker-fg))`,
    borderColor: `hsl(${h} var(--maker-s) var(--maker-border))`
  }
}

export function dotColor(name: string): string {
  return `hsl(${hash(name || '')} 75% 62%)`
}

export function avatarGradient(name: string): string {
  const h = hash(name || '')
  return `linear-gradient(135deg, hsl(${h} 65% 55%), hsl(${(h + 32) % 360} 70% 45%))`
}

/** 跳过前导数字后取第一个中日韩字符；纯英文取首字母大写 */
export function initial(name: string): string {
  const s = String(name || '').replace(/^\d+/, '').trim()
  if (!s) return '?'
  const cjk = s.match(/[぀-ヿ一-鿿가-힯]/)
  if (cjk) return cjk[0]
  const en = s.match(/[A-Za-z]/)
  if (en) return en[0].toUpperCase()
  return s.charAt(0)
}

/** 人物来源页地址 */
export const PERSON_SITE = 'https://www.fouroursonsinc.com/person/'

export function personUrl(pid: string): string {
  return pid ? PERSON_SITE + pid : ''
}
