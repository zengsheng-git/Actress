<template>
  <div class="card">
    <div class="head">
      <span class="label">厂商统计</span>
      <span class="tip-text">点击行可筛选该厂商</span>
    </div>

    <div class="tblbox">
      <table>
        <thead>
          <tr>
            <th>厂商</th>
            <th class="num">条数</th>
            <th>占比</th>
            <th class="num">人物数</th>
            <th>最早</th>
            <th>最晚</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.maker" class="clickable" @click="pick(r.maker)">
            <td data-label="厂商"><span class="tag" :style="makerStyle(r.maker)">{{ r.maker }}</span></td>
            <td data-label="条数" class="num"><b>{{ r.n }}</b></td>
            <td data-label="占比">
              <span class="bar-wrap"><span class="bar" :style="{ width: pct(r.n) }"></span></span>
              <span class="pct">{{ r.pctText }}</span>
            </td>
            <td data-label="人物数" class="num">{{ r.who }}</td>
            <td data-label="最早" class="mono dim">{{ r.min || '-' }}</td>
            <td data-label="最晚" class="mono dim">{{ r.max || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length" class="empty">没有符合条件的记录</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, filtered } from '../store'
import { makerStyle } from '../utils/color'

const rows = computed(() => {
  const cnt = new Map()
  for (const d of filtered.value) {
    const o = cnt.get(d.maker) || { maker: d.maker, n: 0, who: new Set(), min: '', max: '' }
    o.n++
    o.who.add(d.actor)
    if (d.date) {
      if (!o.min || d.date < o.min) o.min = d.date
      if (!o.max || d.date > o.max) o.max = d.date
    }
    cnt.set(d.maker, o)
  }
  return [...cnt.values()]
    .map(o => ({ ...o, who: o.who.size, pctText: (o.n / filtered.value.length * 100).toFixed(1) + '%' }))
    .sort((a, b) => b.n - a.n)
})

const max = computed(() => Math.max(1, ...rows.value.map(r => r.n)))
const pct = n => Math.max(2, (n / max.value) * 100) + '%'

const pick = maker => {
  state.pickedMakers = [maker]
  state.view = 'rows'
  state.limit = 100
}
</script>

<style scoped>
.head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.head .label { margin: 0; }
.tip-text { font-size: 11.5px; color: var(--muted); }

.tblbox { max-height: 66vh; overflow: auto; border: 1px solid var(--line); border-radius: var(--radius-sm); }
.clickable { cursor: pointer; }
.clickable:hover { background: #f7faff; }
.dim { color: var(--text-2); }
.pct { margin-left: 8px; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.empty { padding: 36px; text-align: center; color: var(--muted); }

@media (max-width: 720px) {
  .tblbox { max-height: none; border: none; }
  td[data-label="占比"] { flex-direction: column; align-items: flex-start; gap: 4px; }
  .pct { margin-left: 0; }
}
</style>
