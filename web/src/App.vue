<template>
  <div class="app">
    <header class="top">
      <button class="burger" @click="toggleSide" aria-label="展开/收起人物列表">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>

      <div class="brand">
        <span class="logo">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round">
            <ellipse cx="12" cy="6" rx="7.5" ry="3" />
            <path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" />
            <path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" />
          </svg>
        </span>
        <div class="brand-txt">
          <h1>作品数据浏览器</h1>
          <p>{{ actors.length }} 位人物 · {{ total }} 条记录</p>
        </div>
      </div>

      <span class="grow"></span>

      <button class="primary" @click="exportCsv">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico">
          <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
        </svg>
        导出 CSV
      </button>
    </header>

    <div class="body">
      <PersonPanel :class="{ open: state.drawer, collapsed: state.sideCollapsed }" />
      <div
        v-if="state.drawer"
        class="mask"
        @click="state.drawer = false"
        @touchstart.passive="state.drawer = false"
      ></div>

      <main class="main">
        <div v-if="!actors.length" class="card tip">
          还没有数据：把原始表格 HTML（如 <code>a.html</code>）放进 <code>data/</code> 目录，
          文件名即为人物名，页面会自动加载。
        </div>

        <template v-if="actors.length">
          <StatBar />
          <FilterBar />

          <div class="seg">
            <span class="seg-ind" :style="{ transform: `translateX(${segIndex * 100}%)` }"></span>
            <button
              v-for="t in tabs"
              :key="t.k"
              :class="{ on: state.view === t.k }"
              @click="state.view = t.k"
            >{{ t.t }}</button>
          </div>

          <RecordList v-if="state.view === 'rows'" />
          <MakerStat v-else-if="state.view === 'maker'" />
          <YearStat v-else />
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import PersonPanel from './components/PersonPanel.vue'
import StatBar from './components/StatBar.vue'
import FilterBar from './components/FilterBar.vue'
import RecordList from './components/RecordList.vue'
import MakerStat from './components/MakerStat.vue'
import YearStat from './components/YearStat.vue'
import { actors, state, exportCsv } from './store'

const total = computed(() => actors.reduce((s, a) => s + a.rows.length, 0))

const tabs = [
  { k: 'rows', t: '明细' },
  { k: 'maker', t: '厂商统计' },
  { k: 'year', t: '年份分布' }
]

const segIndex = computed(() => {
  const i = tabs.findIndex(t => t.k === state.view)
  return i < 0 ? 0 : i
})

/* 顶栏按钮：窄屏切抽屉，宽屏折叠侧栏（不依赖媒体查询，任何宽度都可用） */
const toggleSide = () => {
  if (window.innerWidth < 900) state.drawer = !state.drawer
  else state.sideCollapsed = !state.sideCollapsed
}

/* 抽屉：ESC 关闭 + 打开时锁滚动 */
const onKey = e => {
  if (e.key === 'Escape') state.drawer = false
}

watch(
  () => state.drawer,
  v => { document.body.style.overflow = v ? 'hidden' : '' }
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.app { min-height: 100vh; }

.top {
  position: sticky;
  top: 0;
  z-index: 40;          /* 高于抽屉(30)与遮罩(25)，保证汉堡按钮随时可点 */
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, .82);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
}

.burger { display: grid; place-items: center; padding: 6px 9px; }

.brand { display: flex; align-items: center; gap: 10px; }

.logo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #4b7bf7, #7b5cf0);
  box-shadow: 0 6px 16px -6px rgba(75, 123, 247, .8);
}

.brand-txt h1 { font-size: 15.5px; margin: 0; font-weight: 650; letter-spacing: .01em; }
.brand-txt p { margin: 0; font-size: 11.5px; color: var(--muted); }
.ico { vertical-align: -2px; margin-right: 3px; }

.body {
  display: flex;
  gap: 16px;
  padding: 16px 18px;
  max-width: 1500px;
  margin: 0 auto;
  align-items: flex-start;
}

.main { flex: 1; min-width: 0; }
.tip { margin-bottom: 14px; }

/* 分段控件 */
.seg {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #eceff6;
  border-radius: 12px;
  padding: 3px;
  margin-bottom: 14px;
}

.seg button {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  color: var(--text-2);
  font-weight: 500;
  min-height: 32px;
  border-radius: 9px;
}

.seg button:hover { transform: none; box-shadow: none; color: var(--brand); background: transparent; }
.seg button.on { color: var(--brand); background: transparent; font-weight: 600; }

.seg-ind {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc((100% - 6px) / 3);
  height: calc(100% - 6px);
  background: #fff;
  border-radius: 9px;
  box-shadow: 0 1px 3px rgba(16, 24, 40, .14);
  transition: transform .24s cubic-bezier(.4, 0, .2, 1);
}

@media (max-width: 900px) {
  .top { padding: 10px 12px; gap: 8px; }
  .brand-txt p { display: none; }
  .brand-txt h1 { font-size: 15px; }
  .body { padding: 12px; }

  .body :deep(.side) {
    position: fixed;
    top: var(--top-h);
    left: 0;
    bottom: 0;
    z-index: 30;
    width: 268px;
    max-width: 82vw;
    max-height: none;
    border-radius: 0;
    transform: translateX(-100%);
    transition: transform .24s cubic-bezier(.4, 0, .2, 1);
    padding: 14px 14px calc(14px + env(safe-area-inset-bottom));
  }

  .body :deep(.side.open) { transform: none; box-shadow: 6px 0 24px -12px rgba(16, 24, 40, .5); }

  .mask {
    position: fixed;
    top: var(--top-h);
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(16, 24, 40, .38);
    z-index: 25;
  }
}

@media (max-width: 420px) {
  .top .primary { padding: 7px 10px; }
}
</style>
