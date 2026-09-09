const SITE = 'https://www.fouroursonsinc.com/person/'

/** 从人物名（文件名）提取站点 ID，如 "35大桥未久" -> "35" */
export function personId(name) {
  const m = String(name || '').match(/^(\d+)/)
  return m ? m[1] : ''
}

/** 来源页面地址，无编号则返回空串 */
export function personUrl(name) {
  const id = personId(name)
  return id ? SITE + id : ''
}
