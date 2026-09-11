import { StrictMode, lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import './index.css'
import ImportDialog from './components/ImportDialog'
import { JavbusBadge } from './components/JavbusStatus'

const Home = lazy(() => import('./pages/Home'))
const Works = lazy(() => import('./pages/Works'))
const Person = lazy(() => import('./pages/Person'))

const THEME_KEY = 'data-browser:theme'

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return JSON.parse(localStorage.getItem(THEME_KEY) || '"dark"') } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)) } catch { /* 忽略 */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0d14' : '#f3f5fa')
  }, [theme])

  return (
    <button
      className="btn !min-h-8 !px-2.5"
      onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
      aria-label="切换白天/黑夜模式"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
      <span className="hidden sm:inline">{theme === 'dark' ? '浅色' : '深色'}</span>
    </button>
  )
}

function TopBar() {
  const [importOpen, setImportOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--topbar-bg)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#5b6cff] to-[#8b5cf6] text-white shadow-lg shadow-indigo-950">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <ellipse cx="12" cy="6" rx="7.5" ry="3" />
              <path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" />
              <path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-wide">作品数据浏览器</span>
        </NavLink>

        <nav className="ml-4 flex items-center gap-1 text-[13px]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 transition-colors ${isActive ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--brand-fg-2)]'}`
            }
          >
            人物
          </NavLink>
          <NavLink
            to="/works"
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 transition-colors ${isActive ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--brand-fg-2)]'}`
            }
          >
            全部作品
          </NavLink>
        </nav>

        <span className="grow" />
        <button className="btn !min-h-8 !px-2.5" onClick={() => setImportOpen(true)} title="从源站导入人物页">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11m0 0l-4-4m4 4l4-4" />
            <path d="M4 19h16" />
          </svg>
          <span className="hidden sm:inline">导入</span>
        </button>
        <ThemeToggle />
        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    </header>
  )
}

function Fallback() {
  return (
    <div className="grid place-items-center py-32 text-[var(--muted)]">
      <div className="size-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6d7cff]" />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <div className="min-h-screen">
        <TopBar />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/works" element={<Works />} />
            <Route path="/person/:id" element={<Person />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
        <JavbusBadge />
      </div>
    </HashRouter>
  </StrictMode>
)
