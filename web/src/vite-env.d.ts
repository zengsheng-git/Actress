/// <reference types="vite/client" />

declare module 'virtual:people-manifest' {
  import type { PersonData } from './lib/parse'
  /** 首页人物卡片用的轻量清单项（与 src/lib/types.ts 的 PersonMeta 保持一致） */
  export interface PersonMeta {
    id: string
    name: string
    pid: string
    avatar: string
    rows: number
    photos: number
    video: boolean
    hasProfile: boolean
    /** 又名/艺名列表（来自资料「又名」字段，按空白拆分） */
    aliases: string[]
  }
  export const people: PersonMeta[]
  export function loadPerson(id: string): Promise<PersonData | null>
}

declare module 'virtual:works-index' {
  import type { WorkRow } from './lib/parse'
  export type FlatRow = WorkRow & { actorId: string; actorName: string }
  const rows: FlatRow[]
  export default rows
}

declare module 'virtual:person/*' {
  import type { PersonData } from './lib/parse'
  const person: PersonData
  export default person
}
