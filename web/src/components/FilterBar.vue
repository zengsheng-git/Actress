<template>
  <div class="card">
    <div class="head">
      <span class="label">厂商</span>
      <span class="tip-text">点击筛选，可多选</span>
      <span class="grow"></span>
      <span v-if="state.pickedMakers.length" class="badge">已选 {{ state.pickedMakers.length }}</span>
    </div>

    <div class="chips">
      <span
        v-for="[m, n] in makerCounts"
        :key="m"
        class="chip"
        :class="{ on: state.pickedMakers.includes(m) }"
        @click="toggleMaker(m)"
      >
        <i class="dot" :style="{ background: dotColor(m) }"></i>
        {{ m }}<i class="n">{{ n }}</i>
      </span>
      <span v-if="!makerCounts.length" class="hint">暂无数据</span>
    </div>

    <div class="row tools">
      <input v-model="state.kw" type="search" placeholder="搜索番号…" class="search" />

      <select v-model="state.year">
        <option value="">全部年份</option>
        <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
      </select>

      <select v-model.number="state.minLen">
        <option :value="0">全部时长</option>
        <option :value="120">≥120 分</option>
        <option :value="240">≥240 分</option>
        <option :value="480">≥480 分</option>
        <option :value="960">≥960 分</option>
      </select>

      <select v-model="state.sortKey">
        <option value="date">按发行</option>
        <option value="code">按番号</option>
        <option value="mins">按片长</option>
        <option value="maker">按厂商</option>
        <option value="actor">按人物</option>
      </select>

      <button :class="{ on: state.sortDir > 0 }" @click="state.sortDir = -state.sortDir">
        {{ state.sortDir > 0 ? '升序 ↑' : '降序 ↓' }}
      </button>

      <button :class="{ on: state.mergeBD }" @click="toggleMerge">合并 BD 重复版</button>
      <button @click="clearMakers">厂商清空</button>
      <button @click="resetAll">重置</button>
    </div>
  </div>
</template>

<script setup>
import { makerCounts, years, state, toggleMaker, resetAll } from '../store'
import { dotColor } from '../utils/color'

const toggleMerge = () => {
  state.mergeBD = !state.mergeBD
  state.limit = 100
}

const clearMakers = () => {
  state.pickedMakers = []
  state.limit = 100
}
</script>

<style scoped>
.head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.head .label { margin: 0; }
.tip-text { font-size: 11.5px; color: var(--muted); }

.badge {
  font-size: 11.5px;
  background: var(--brand-soft);
  color: var(--brand);
  border-radius: 999px;
  padding: 1px 9px;
  font-weight: 500;
}

.chips { display: flex; flex-wrap: wrap; gap: 7px; }

.chip {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 999px;
  padding: 5px 12px 5px 10px;
  font-size: 12.5px;
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all .15s ease;
}

.chip:hover { border-color: var(--brand-2); transform: translateY(-1px); }
.chip.on { background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: #fff; }
.chip.on .dot { background: #fff !important; box-shadow: 0 0 0 2px rgba(255, 255, 255, .35); }
.chip.on .n { background: rgba(255, 255, 255, .22); color: #fff; opacity: 1; }

.dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }

.n {
  font-style: normal;
  font-size: 11px;
  opacity: .7;
  background: #f1f4f9;
  border-radius: 8px;
  padding: 0 6px;
  font-variant-numeric: tabular-nums;
}

.tools { margin-top: 13px; padding-top: 13px; border-top: 1px dashed var(--line); }

.search {
  padding-left: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b94a7' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
  min-width: 170px;
  flex: 1 1 170px;
}

@media (max-width: 720px) {
  .chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
  .chip { flex: none; padding: 7px 13px 7px 10px; }
  input[type="search"], select { flex: 1 1 45%; min-width: 130px; }
  .tools button { flex: 1 1 auto; }
}
</style>
