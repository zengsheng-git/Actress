<template>
  <div class="stats">
    <div class="stat">
      <span class="k">当前</span>
      <span class="v who" :title="currentLabel">
        <a v-if="personLink" :href="personLink" target="_blank" rel="noopener" class="plink">
          {{ currentLabel }}
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 5h5v5" /><path d="M19 5l-8 8" />
            <path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" />
          </svg>
        </a>
        <template v-else>{{ currentLabel }}</template>
      </span>
    </div>
    <div class="stat"><span class="k">人物</span><span class="v">{{ actors.length }}</span></div>
    <div class="stat"><span class="k">记录</span><span class="v">{{ baseRows.length }}</span></div>
    <div class="stat hl"><span class="k">筛选结果</span><span class="v">{{ filtered.length }}</span></div>
    <div class="stat"><span class="k">厂商</span><span class="v">{{ makerCounts.length }}</span></div>
    <div class="stat"><span class="k">时间跨度</span><span class="v sm">{{ span }}</span></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { actors, state, baseRows, filtered, makerCounts, span } from '../store'
import { personUrl } from '../utils/person'

const currentLabel = computed(() => {
  const n = state.pickedActors.length
  if (!n) return '全部'
  if (n === 1) {
    const a = actors.find(x => x.id === state.pickedActors[0])
    return a ? a.name : state.pickedActors[0]
  }
  return `${n} 位`
})

/** 仅单人查看时给出来源链接 */
const personLink = computed(() =>
  state.pickedActors.length === 1 ? personUrl(state.pickedActors[0]) : ''
)
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.stat {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 13px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.k { font-size: 11.5px; color: var(--muted); letter-spacing: .04em; }

.v {
  font-size: 19px;
  font-weight: 650;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.v.sm { font-size: 15px; }

.stat.hl { border-color: #cddcff; background: linear-gradient(180deg, #f5f8ff, #fff); }
.stat.hl .v { color: var(--brand); }

.who {
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plink {
  color: var(--brand);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.plink:hover { text-decoration: underline; }

@media (max-width: 720px) {
  .stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .v { font-size: 17px; }
  .stat { padding: 9px 11px; }
}
</style>
