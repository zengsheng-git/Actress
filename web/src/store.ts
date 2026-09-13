import { create } from 'zustand'
import type { SortDir, SortKey } from './lib/filter'

export type WorksView = 'rows' | 'maker' | 'year'
/** 有码/无码筛选：空 = 全部（仅 JavBus 数据源有此字段） */
export type SectionFilter = '' | 'censored' | 'uncensored'
/** 下载状态筛选：all = 全部，downloaded = 仅看已下载，missing = 仅看未下载 */
export type DownloadFilter = 'all' | 'downloaded' | 'missing'

interface FilterState {
  // /works 页：选中人物（空 = 全部）
  pickedActors: string[]
  // 共用筛选
  pickedMakers: string[]
  kw: string
  year: string
  minLen: number
  mergeBD: boolean
  section: SectionFilter
  /** 下载状态筛选（依据 works-export/download.json 的 key 集合） */
  downloadFilter: DownloadFilter
  sortKey: SortKey
  sortDir: SortDir
  limit: number
  // /works 页视图
  view: WorksView
  // 数据源：fouroursonsinc（默认，data/*.html）或 javbus（works-export/*.tsv）
  dataSource: 'fouroursonsinc' | 'javbus'

  setPickedActors: (ids: string[]) => void
  toggleActor: (id: string) => void
  toggleMaker: (m: string) => void
  setMakers: (ms: string[]) => void
  setKw: (kw: string) => void
  setYear: (y: string) => void
  setMinLen: (n: number) => void
  toggleMergeBD: () => void
  setSection: (s: SectionFilter) => void
  setDownloadFilter: (d: DownloadFilter) => void
  setSort: (k: SortKey) => void
  setView: (v: WorksView) => void
  resetFilters: () => void
  setDataSource: (s: 'fouroursonsinc' | 'javbus') => void
}

const LS_KEY = 'data-browser:v2'

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
})()

export const useFilterStore = create<FilterState>((set, get) => ({
  pickedActors: Array.isArray(saved.pickedActors) ? saved.pickedActors : [],
  pickedMakers: [],
  kw: '',
  year: '',
  minLen: 0,
  mergeBD: false,
  section: '',
  downloadFilter: 'all',
  sortKey: 'date',
  sortDir: -1,
  limit: 100,
  view: 'rows',
  dataSource: 'fouroursonsinc',

  setPickedActors: ids => {
    set({ pickedActors: ids, pickedMakers: [], limit: 100 })
    persist()
  },
  toggleActor: id => {
    const cur = get().pickedActors
    set({
      pickedActors: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
      pickedMakers: [],
      limit: 100
    })
    persist()
  },
  toggleMaker: m => {
    const cur = get().pickedMakers
    set({
      pickedMakers: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m],
      limit: 100
    })
  },
  setMakers: ms => set({ pickedMakers: ms, limit: 100 }),
  setKw: kw => set({ kw, limit: 100 }),
  setYear: year => set({ year, limit: 100 }),
  setMinLen: minLen => set({ minLen, limit: 100 }),
  toggleMergeBD: () => set(s => ({ mergeBD: !s.mergeBD, limit: 100 })),
  setSection: section => set({ section, limit: 100 }),
  setDownloadFilter: downloadFilter => set({ downloadFilter, limit: 100 }),
  setSort: key => {
    const { sortKey, sortDir } = get()
    set(
      sortKey === key
        ? { sortDir: (sortDir * -1) as SortDir }
        : { sortKey: key, sortDir: key === 'date' || key === 'mins' ? -1 : 1 }
    )
  },
  setView: view => set({ view }),
  resetFilters: () =>
    set({ pickedMakers: [], kw: '', year: '', minLen: 0, mergeBD: false, section: '', downloadFilter: 'all', sortKey: 'date', sortDir: -1, limit: 100, view: 'rows' }),
  setDataSource: s => set({ dataSource: s })
}))

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ pickedActors: useFilterStore.getState().pickedActors }))
  } catch { /* 隐私模式下不可用，忽略 */ }
}
