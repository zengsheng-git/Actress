<template>
  <div class="card">
    <div class="head">
      <span class="label">年份分布</span>
      <span class="tip-text">点击行可筛选该年份</span>
    </div>

    <div class="tblbox">
      <table>
        <thead>
          <tr>
            <th>年份</th>
            <th class="num">条数</th>
            <th>分布</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[y, n] in rows" :key="y" class="clickable" @click="pick(y)">
            <td data-label="年份"><b class="mono">{{ y }}</b></td>
            <td data-label="条数" class="num">{{ n }}</td>
            <td data-label="分布">
              <span class="bar-wrap wide">
                <span class="bar" :style="{ width: (n / max) * 100 + '%' }"></span>
              </span>
              <span class="pct">{{ (n / total * 100).toFixed(1) }}%</span>
            </td>
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

const rows = computed(() => {
  const cnt = new Map()
  for (const d of filtered.value) {
    if (d.year) cnt.set(d.year, (cnt.get(d.year) || 0) + 1)
  }
  return [...cnt.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

const max = computed(() => Math.max(1, ...rows.value.map(r => r[1])))
const total = computed(() => Math.max(1, filtered.value.length))

const pick = y => {
  state.year = y
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
.bar-wrap.wide { width: 320px; max-width: 46vw; }
.pct { margin-left: 8px; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.empty { padding: 36px; text-align: center; color: var(--muted); }

@media (max-width: 720px) {
  .tblbox { max-height: none; border: none; }
  td[data-label="分布"] { flex-direction: column; align-items: flex-start; gap: 4px; }
  .pct { margin-left: 0; }
}
</style>
