<template>
  <div class="msel" ref="root">
    <button type="button" class="trigger" :class="{ on: state.pickedMakers.length }" @click="open = !open">
      <i v-if="state.pickedMakers.length" class="tdot" :style="{ background: dotColor(state.pickedMakers[0]) }"></i>
      <span class="tlabel">{{ label }}</span>
      <svg class="caret" :class="{ up: open }" viewBox="0 0 12 12" width="11" height="11">
        <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>

    <!-- 下拉面板 -->
    <div v-if="open" class="panel">
      <input v-model="kw" type="search" placeholder="搜索厂商…" class="psearch" />

      <div class="opts">
        <div
          v-for="o in opts"
          :key="o.name"
          class="opt"
          :class="{ sel: state.pickedMakers.includes(o.name) }"
          @click="toggle(o.name)"
        >
          <i class="dot" :style="{ background: dotColor(o.name) }"></i>
          <span class="nm">{{ o.name }}</span>
          <span class="n">{{ o.count }}</span>
        </div>
        <div v-if="!opts.length" class="empty">无匹配厂商</div>
      </div>

      <div class="pfoot">
        <button type="button" @click="pickShown">选中当前</button>
        <button type="button" @click="clearAll">清空</button>
        <span class="grow"></span>
        <button type="button" class="primary" @click="open = false">完成</button>
      </div>
    </div>

    <!-- 已选标签（收起时显示，点一下移除） -->
    <div v-else-if="state.pickedMakers.length" class="picked">
      <span v-for="m in state.pickedMakers" :key="m" class="mini" :title="`${m}（点击移除）`" @click="toggle(m)">
        <i class="dot" :style="{ background: dotColor(m) }"></i>{{ m }}<i class="x">×</i>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { makerCounts, state, toggleMaker } from '../store'
import { dotColor } from '../utils/color'

const root = ref(null)
const open = ref(false)
const kw = ref('')

const label = computed(() =>
  state.pickedMakers.length
    ? `已选 ${state.pickedMakers.length} / ${makerCounts.value.length} 个厂商`
    : `全部厂商（共 ${makerCounts.value.length} 个）`
)

const opts = computed(() => {
  const k = kw.value.trim().toLowerCase()
  const src = k
    ? makerCounts.value.filter(([m]) => m.toLowerCase().includes(k))
    : makerCounts.value
  return src.map(([name, count]) => ({ name, count }))
})

const pickShown = () => {
  const set = new Set(state.pickedMakers)
  opts.value.forEach(o => set.add(o.name))
  state.pickedMakers = [...set]
  state.limit = 100
}

const clearAll = () => {
  state.pickedMakers = []
  state.limit = 100
}

/* 点击组件外部时收起面板 */
const onDoc = e => {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onDoc))
onUnmounted(() => document.removeEventListener('click', onDoc))
</script>

<style scoped>
.msel { position: relative; }

.trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  text-align: left;
}

.trigger:hover { transform: none; }
.trigger.on {
  background: var(--brand-soft);
  border-color: var(--brand-2);
  color: var(--brand);
  font-weight: 500;
}

.tlabel { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tdot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.caret { flex: none; color: var(--muted); transition: transform .18s; }
.caret.up { transform: rotate(180deg); }
.trigger.on .caret { color: var(--brand); }

.panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 15;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 10px 40px -10px rgba(16, 24, 40, .35);
  padding: 10px;
  animation: pop .16s ease;
}

@keyframes pop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.psearch { width: 100%; }

.opts {
  max-height: 300px;
  overflow: auto;
  margin-top: 8px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
}

.opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 13px;
  transition: background .1s;
}

.opt:hover { background: #f7faff; }
.opt.sel { background: var(--brand-soft); color: var(--brand); font-weight: 500; }
.dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.n { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.opt.sel .n { color: var(--brand); }

.empty { padding: 26px; text-align: center; color: var(--muted); font-size: 12px; }

.pfoot { display: flex; gap: 8px; align-items: center; margin-top: 9px; }
.pfoot button { padding: 6px 11px; min-height: 30px; font-size: 12.5px; }

.picked { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

.mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  max-width: 100%;
  transition: all .14s;
}

.mini:hover { border-color: #e3a9a2; color: #cf4b3f; background: #fff6f5; }
.mini .nm { flex: none; }
.mini .x { font-style: normal; color: var(--muted); }
.mini:hover .x { color: #cf4b3f; }

@media (max-width: 720px) {
  .opts { max-height: 42vh; }
  .panel { padding: 9px; }
}
</style>
