<template>
  <div class="card">
    <div class="tblbox">
      <table>
        <thead>
          <tr>
            <th class="sortable" @click="setSort('code')">番号<span class="ar">{{ arrow('code') }}</span></th>
            <th v-if="multi" class="sortable" @click="setSort('actor')">人物<span class="ar">{{ arrow('actor') }}</span></th>
            <th class="sortable" @click="setSort('mins')">片长<span class="ar">{{ arrow('mins') }}</span></th>
            <th class="sortable" @click="setSort('date')">发行<span class="ar">{{ arrow('date') }}</span></th>
            <th class="sortable" @click="setSort('maker')">厂商<span class="ar">{{ arrow('maker') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in shown" :key="d.actor + d.code">
            <td data-label="番号"><b class="mono">{{ d.code }}</b></td>
            <td v-if="multi" data-label="人物" class="muted">{{ d.actorName }}</td>
            <td data-label="片长">{{ d.len }}</td>
            <td data-label="发行" class="mono dim">{{ d.date }}</td>
            <td data-label="厂商"><span class="tag" :style="makerStyle(d.maker)">{{ d.maker }}</span></td>
          </tr>
        </tbody>
      </table>

      <div v-if="!filtered.length" class="empty">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <p>没有符合条件的记录</p>
      </div>
    </div>

    <div v-if="filtered.length > state.limit" class="pager">
      <button class="more" @click="state.limit += 100">
        加载更多 · 已显示 {{ shown.length }} / {{ filtered.length }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, filtered, selectedActors, setSort } from '../store'
import { makerStyle } from '../utils/color'

const multi = computed(() => selectedActors.value.length > 1)
const shown = computed(() => filtered.value.slice(0, state.limit))
const arrow = k => (state.sortKey === k ? (state.sortDir > 0 ? ' ▲' : ' ▼') : '')
</script>

<style scoped>
.tblbox { max-height: 66vh; overflow: auto; border: 1px solid var(--line); border-radius: var(--radius-sm); }
.dim { color: var(--text-2); }
.ar { opacity: .5; font-size: 9px; }

.empty { padding: 40px; text-align: center; color: var(--muted); }
.empty p { margin: 8px 0 0; font-size: 13px; }
.empty svg { opacity: .5; }

.pager { padding-top: 12px; }

.more {
  width: 100%;
  border: 1px dashed var(--line-strong, #d7dfec);
  background: #fff;
  color: var(--text-2);
  border-radius: var(--radius-sm);
  padding: 10px;
}

.more:hover { border-color: var(--brand-2); border-style: solid; color: var(--brand); transform: none; }

@media (max-width: 720px) {
  .tblbox { max-height: none; border: none; }
  td[data-label="厂商"] { justify-content: space-between; }
}
</style>
