<template>
  <div class="card">
    <div class="head">
      <span class="label">厂商</span>
      <span class="tip-text">下拉搜索，可多选</span>
    </div>

    <MakerSelect />

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
      <button @click="resetAll">重置</button>
    </div>
  </div>
</template>

<script setup>
import MakerSelect from './MakerSelect.vue'
import { years, state, resetAll } from '../store'

const toggleMerge = () => {
  state.mergeBD = !state.mergeBD
  state.limit = 100
}
</script>

<style scoped>
/* 入场动画会让每张卡片形成独立层叠上下文，必须显式提升层级，
   否则下拉面板会被排在后面的表格卡片盖住 */
.card { position: relative; z-index: 5; }

.head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.head .label { margin: 0; }
.tip-text { font-size: 11.5px; color: var(--muted); }

.tools { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); }

.search {
  padding-left: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b94a7' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
  min-width: 170px;
  flex: 1 1 170px;
}

@media (max-width: 720px) {
  input[type="search"], select { flex: 1 1 45%; min-width: 130px; }
  .tools button { flex: 1 1 auto; }
}
</style>
