import type { PersonData, WorkRow } from './parse'

/** 首页人物卡片用的轻量清单项 */
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

/** 跨人物记录（/works 用），在 WorkRow 基础上附带来源人物 */
export type FlatRow = WorkRow & { actorId: string; actorName: string; section?: 'censored' | 'uncensored' }

export type { PersonData }
