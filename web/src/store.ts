import { create } from 'zustand'
import type { SortDir, SortKey } from './lib/filter'

export type WorksView = 'rows' | 'maker' | 'year'

interface FilterState {
  // /works 页：选中人物（空 = 全部）
  pickedActors: string[]
  // 共用筛选
  pickedMakers: string[]
  kw: string
  year: string
  minLen: number
  mergeBD: boolean
  sortKey: SortKey
  sortDir: SortDir
  limit: number
  // /works 页视图
  view: WorksView

  setPickedActors: (ids: string[]) => void
  toggleActor: (id: string) => void
  toggleMaker: (m: string) => void
  setMakers: (ms: string[]) => void
  setKw: (kw: string) => void
  setYear: (y: string) => void
  setMinLen: (n: number) => void
  toggleMergeBD: () => void
  setSort: (k: SortKey) => void
  setView: (v: WorksView) => void
  resetFilters: () => void
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
  sortKey: 'date',
  sortDir: -1,
  limit: 100,
  view: 'rows',

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
    set({ pickedMakers: [], kw: '', year: '', minLen: 0, mergeBD: false, sortKey: 'date', sortDir: -1, limit: 100, view: 'rows' })
}))

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ pickedActors: useFilterStore.getState().pickedActors }))
  } catch { /* 隐私模式下不可用，忽略 */ }
}
