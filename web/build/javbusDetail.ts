/**
 * JavBus 详情页字段解析（发行日/时长/厂商/系列）。
 * 独立模块，避免与 tools/fetch-actress-works.ts 形成循环引用。
 */
export interface DetailFields {
  date: string
  mins: number
  studio: string
  series: string
}

export function detailFields(html: string): DetailFields {
  // 发行日 + 时长在同一段：發行日期】2020-09-12，【長度】480分鐘
  const header = html.match(/發行日期】\s*(\d{4}-\d{2}-\d{2})[\s\S]*?長度】\s*(\d+)\s*分鐘/)
  const date = header?.[1] || ''
  const mins = header?.[2] ? Number(header[2]) : 0
  const studio = html.match(/製作商:<\/span>\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
  const series = html.match(/系列:<\/span>\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
  return { date, mins, studio, series }
}