<template>
  <aside
    class="side card"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
  >
    <div class="head">
      <span class="label">人物（{{ state.multiSelect ? '可多选' : '单击只看该人' }}）</span>
      <span class="grow"></span>
      <button
        class="close"
        aria-label="收起人物列表"
        @click="closeSide"
        @touchstart.passive="closeSide"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <input v-model="state.actorKw" type="search" placeholder="搜索人物…" class="full search" />

    <div class="list">
      <div
        v-for="a in list"
        :key="a.id"
        class="actor"
        :class="{ sel: state.pickedActors.includes(a.id) }"
        @click="pick(a.id)"
      >
        <span class="ava" :style="avatarStyle(a.id)">{{ initial(a.id) }}</span>
        <span class="name">{{ a.id }}</span>
        <span class="n">{{ a.rows.length }}</span>
        <a
          v-if="personUrl(a.id)"
          class="src"
          :href="personUrl(a.id)"
          target="_blank"
          rel="noopener"
          :title="`打开来源页面 (ID ${personId(a.id)})`"
          @click.stop
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 5h5v5" /><path d="M19 5l-8 8" />
            <path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" />
          </svg>
        </a>
      </div>
      <div v-if="!list.length" class="hint">无匹配人物</div>
    </div>

    <div class="row btns">
      <button class="flex" :class="{ on: state.multiSelect }" @click="toggleMulti">多选</button>
      <button class="flex" @click="selectAll">全选</button>
      <button class="flex" @click="clearActors">全部</button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { actors, state, toggleActor, selectActor } from '../store'
import { avatarStyle, initial } from '../utils/color'
import { personUrl, personId } from '../utils/person'

const list = computed(() => {
  const kw = state.actorKw.trim().toLowerCase()
  return kw ? actors.filter(a => a.id.toLowerCase().includes(kw)) : actors
})

const selectAll = () => {
  state.pickedActors = actors.map(a => a.id)
  state.pickedMakers = []
  state.multiSelect = true
  state.drawer = false
}

const clearActors = () => {
  state.pickedActors = []
  state.pickedMakers = []
  state.limit = 100
  state.drawer = false
}

const toggleMulti = () => {
  state.multiSelect = !state.multiSelect
  if (!state.multiSelect && state.pickedActors.length > 1) {
    state.pickedActors = state.pickedActors.slice(0, 1)
  }
}

const pick = id => {
  if (state.multiSelect) {
    toggleActor(id)
  } else {
    selectActor(id)
    state.drawer = false
  }
}

/** 收起：窄屏关抽屉，宽屏折叠侧栏 */
const closeSide = () => {
  state.drawer = false
  state.sideCollapsed = true
}

/* 移动端：向左滑动关闭抽屉 */
let startX = 0
let startY = 0

const onTouchStart = e => {
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
}

const onTouchEnd = e => {
  const dx = e.changedTouches[0].clientX - startX
  const dy = e.changedTouches[0].clientY - startY
  if (dx < -45 && Math.abs(dx) > Math.abs(dy)) state.drawer = false
}
</script>

<style scoped>
.side {
  width: 238px;
  flex: none;
  position: sticky;
  top: 68px;
  max-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
}

.head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.head .label { margin: 0; }

/* 折叠：窄屏未打开抽屉时、或宽屏折叠时隐藏 */
.side.collapsed:not(.open) { display: none; }

.close {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  border-radius: 8px;
  flex: none;
  color: var(--muted);
}

.full { width: 100%; }

.search {
  padding-left: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b94a7' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
}

.list { overflow: auto; margin: 10px -6px; flex: 1; }

.actor {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  transition: background .14s;
}

.actor:hover { background: #f4f7fc; }
.actor.sel { background: var(--brand-soft); color: var(--brand); font-weight: 600; }

.actor.sel::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 5px;
  bottom: 5px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--brand);
}

.ava {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex: none;
  box-shadow: 0 3px 8px -3px rgba(16, 24, 40, .5);
}

.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.src {
  color: var(--muted);
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex: none;
  margin-left: 6px;
  transition: all .14s ease;
}

.src:hover { background: #fff; color: var(--brand); box-shadow: 0 2px 6px -2px rgba(16, 24, 40, .28); }
.actor.sel .src { color: var(--brand); }
.n { margin-left: auto; font-size: 11px; color: var(--muted); font-weight: 400; font-variant-numeric: tabular-nums; }
.actor.sel .n { color: var(--brand); }
.btns { margin-top: 10px; gap: 8px; }
.flex { flex: 1; padding: 7px 6px; }

@media (max-width: 900px) {
  .actor { padding: 10px; }
  .ava { width: 30px; height: 30px; border-radius: 9px; }
}
</style>
