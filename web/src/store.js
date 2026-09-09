import { reactive, computed, watch } from 'vue'
import { parseTable, toMins, normCode, toCsv, download } from './utils/parse'

// data/ 目录下所有 html 的原文，由 vite.config.js 的虚拟模块提供（新增文件自动生效）
import dataFiles from 'virtual:data-files'

function loadActors() {
  const map = new Map()
  for (const [path, html] of Object.entries(dataFiles)) {
    const id = path.split('/').pop().replace(/\.html?$/i, '')
    const rows = []
    for (const [code, len, date, maker] of parseTable(html)) {
      rows.push({
        actor: id,
        code,
        len,
        mins: toMins(len),
        date,
        maker: maker || '未标注',
        year: String(date).slice(0, 4),
        norm: normCode(code)
      })
    }
    if (rows.length) map.set(id, rows)
  }
  return [...map.entries()]
    .map(([id, rows]) => ({ id, rows }))
    .sort((a, b) => a.id.localeCompare(b.id, 'zh'))
}

export const actors = loadActors()

/* 记住上次选中的人物，刷新后回到原来的视图（仅存 id，不存数据） */
const LS_KEY = 'data-browser:view'

const saved = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    const ids = Array.isArray(raw.pickedActors) ? raw.pickedActors : []
    return {
      pickedActors: ids.filter(id => actors.some(a => a.id === id)),
      sideCollapsed: !!raw.sideCollapsed
    }
  } catch {
    return { pickedActors: [], sideCollapsed: false }
  }
})()

export const state = reactive({
  pickedActors: saved.pickedActors,   // 空 = 全部人物
  pickedMakers: [],     // 空 = 全部厂商
  kw: '',
  year: '',
  minLen: 0,
  mergeBD: false,
  sortKey: 'date',
  sortDir: -1,
  view: 'rows',         // rows | maker | year
  limit: 100,
  drawer: false,                  // 窄屏：人物抽屉
  sideCollapsed: saved.sideCollapsed, // 宽屏：侧栏折叠（任何尺寸下 ✕ 都能收起左侧导航）
  actorKw: '',
  multiSelect: false    // 人物列表：false = 单击只看该人，true = 可多选对比
})

/* ---------------- 派生数据 ---------------- */

export const selectedActors = computed(() =>
  state.pickedActors.length
    ? actors.filter(a => state.pickedActors.includes(a.id))
    : actors
)

export const baseRows = computed(() => selectedActors.value.flatMap(a => a.rows))

export const years = computed(() =>
  [...new Set(actors.flatMap(a => a.rows.map(r => r.year)))].filter(Boolean).sort().reverse()
)

export const makerCounts = computed(() => {
  const cnt = new Map()
  for (const d of baseRows.value) cnt.set(d.maker, (cnt.get(d.maker) || 0) + 1)
  return [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
})

export const filtered = computed(() => {
  const kw = state.kw.trim().toLowerCase()
  let rows = baseRows.value.filter(d =>
    (!state.pickedMakers.length || state.pickedMakers.includes(d.maker)) &&
    (!state.year || d.year === state.year) &&
    d.mins >= Number(state.minLen) &&
    (!kw || d.code.toLowerCase().includes(kw) || d.maker.toLowerCase().includes(kw))
  )

  if (state.mergeBD) {
    const map = new Map()
    for (const r of rows) {
      const k = r.actor + '|' + r.norm
      const old = map.get(k)
      if (!old) map.set(k, r)
      else if (old.code.includes('BD') && !r.code.includes('BD')) map.set(k, r)
    }
    rows = [...map.values()]
  }

  const k = state.sortKey
  rows = rows.slice().sort((a, b) => {
    const r = k === 'mins' ? a.mins - b.mins
      : k === 'actor' ? String(a.actor).localeCompare(String(b.actor), 'zh')
        : String(a[k]).localeCompare(String(b[k]), 'ja')
    return r * state.sortDir
  })
  return rows
})

export const span = computed(() => {
  const ys = filtered.value.map(r => r.year).filter(Boolean).sort()
  if (!ys.length) return '-'
  return ys[0] === ys[ys.length - 1] ? ys[0] : `${ys[0]} ~ ${ys[ys.length - 1]}`
})

/* ---------------- 操作 ---------------- */

export function toggleIn(list, value) {
  const i = list.indexOf(value)
  i >= 0 ? list.splice(i, 1) : list.push(value)
}

export function toggleActor(id) {
  toggleIn(state.pickedActors, id)
  state.pickedMakers = []
  state.limit = 100
}

/** 单击：只看这个人；再点一次已选中者则回到全部 */
export function selectActor(id) {
  const only = state.pickedActors.length === 1 && state.pickedActors[0] === id
  state.pickedActors = only ? [] : [id]
  state.pickedMakers = []
  state.limit = 100
}

export function toggleMaker(m) {
  toggleIn(state.pickedMakers, m)
  state.limit = 100
}

export function setSort(key) {
  if (state.sortKey === key) state.sortDir = -state.sortDir
  else {
    state.sortKey = key
    state.sortDir = (key === 'date' || key === 'mins') ? -1 : 1
  }
}

export function resetAll() {
  state.pickedActors = []
  state.pickedMakers = []
  state.kw = ''
  state.year = ''
  state.minLen = 0
  state.mergeBD = false
  state.sortKey = 'date'
  state.sortDir = -1
  state.limit = 100
  state.view = 'rows'
}

/* 选择变化时写入 localStorage（隐私模式下 localStorage 不可用，已容错） */
watch(
  () => [state.pickedActors, state.sideCollapsed],
  () => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ pickedActors: state.pickedActors, sideCollapsed: state.sideCollapsed })
      )
    } catch { /* 忽略 */ }
  },
  { deep: true }
)

export function exportCsv() {
  const multi = selectedActors.value.length > 1
  const name = state.pickedActors.length === 1 ? state.pickedActors[0] : 'export'
  download(`${name}.csv`, toCsv(filtered.value, multi), 'text/csv;charset=utf-8')
}
