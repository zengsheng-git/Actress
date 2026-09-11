import type { FlatRow } from './types'

/** JavBus JSON 单条记录结构 */
export interface TsvRow {
  code: string
  section: 'censored' | 'uncensored'
  date: string
  mins: number
  studio: string
  series: string
  cover: string
  title: string
}

/** JavBus JSON 单人物数据 */
export interface ActorWorks {
  actorId: string
  name: string
  works: TsvRow[]
}

const tsvCache = new Map<string, string>()
async function loadTsv(actorId: string): Promise<string> {
  if (tsvCache.has(actorId)) return tsvCache.get(actorId)!
  // Vite 虚拟模块 URL `/@id/virtual:works-tsv/<id>` 用 fetch 拉 JS 源码
  // （`import()` 走运行时 importModule 路径，虚拟模块不支持）
  const res = await fetch('/@id/virtual:works-tsv/' + encodeURIComponent(actorId))
  const js = await res.text()
  // 源码是 `export default {...JSON...};\n` 形式，提取对象字面量
  const m = js.match(/export default\s+([\s\S]+?);\s*$/m)
  const literal = m ? m[1] : ''
  tsvCache.set(actorId, literal)
  return literal
}

const tsvFetchCache = new Map<string, Promise<ActorWorks | null>>()
function getActorTsv(actorId: string): Promise<ActorWorks | null> {
  if (!tsvFetchCache.has(actorId)) tsvFetchCache.set(actorId, parseActorTsv(actorId))
  return tsvFetchCache.get(actorId)!
}

async function parseActorTsv(actorId: string): Promise<ActorWorks | null> {
  const text = await loadTsv(actorId)
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as ActorWorks
    return {
      actorId: parsed.actorId || actorId,
      name: parsed.name || actorId.replace(/^\d+/, ''),
      works: parsed.works ?? []
    }
  } catch { return null }
}

/** 批量加载人物 JavBus 数据并扁平化为 FlatRow */
export function getTsvRows(actorIds: string[]): Promise<ActorWorks[]> {
  return Promise.all(actorIds.map(getActorTsv)).then(arrs => arrs.filter((d): d is ActorWorks => Boolean(d)))
}

/** JavBus JSON 记录 → 表格行（Works / Person 共用） */
export function toFlatRows(d: ActorWorks): FlatRow[] {
  return d.works.map(r => ({
    actorId: d.actorId,
    actorName: d.name,
    code: r.code,
    len: r.mins ? `${r.mins} 分` : '',
    mins: r.mins,
    date: r.date,
    year: r.date.slice(0, 4),
    maker: r.studio || '未标注',
    norm: r.code.replace(/^([A-Za-z]+?)BD-/, '$1-'),
    section: r.section
  }))
}
