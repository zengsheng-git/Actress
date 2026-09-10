import { useEffect, useState } from 'react'
import { people } from 'virtual:people-manifest'
import { useFilterStore } from '../store'
import { personUrl } from '../lib/color'
import Avatar from './Avatar'

/**
 * 人物侧栏面板（沿用旧版交互）：
 *   默认单击 = 只看该人，再点一次已选中者回到全部；多选模式可勾多个人物对比；
 *   支持搜索、全选、全部重置、来源页链接。
 * 宽屏为 sticky 侧栏；窄屏由父组件以抽屉方式打开（open=true）。
 */
export default function PersonPanel({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { pickedActors, setPickedActors, toggleActor } = useFilterStore()
  const [multi, setMulti] = useState(false)
  const [kw, setKw] = useState('')

  const list = kw.trim()
    ? people.filter(p => p.name.toLowerCase().includes(kw.trim().toLowerCase()) || p.id.toLowerCase().includes(kw.trim().toLowerCase()))
    : people

  /** 单击：只看这个人；再点一次已选中者则回到全部 */
  const pick = (id: string) => {
    if (multi) toggleActor(id)
    else {
      const only = pickedActors.length === 1 && pickedActors[0] === id
      setPickedActors(only ? [] : [id])
      onClose?.()
    }
  }

  const toggleMulti = () => {
    setMulti(v => !v)
    // 退出多选时若选了多人，只保留第一个
    if (multi && pickedActors.length > 1) setPickedActors(pickedActors.slice(0, 1))
  }

  const modeLabel = multi ? '可多选' : '单击只看该人'

  return (
    <>
      <p className="mb-2 text-[11px] text-[var(--faint)]">{modeLabel}</p>
      <input
        type="search"
        value={kw}
        onChange={e => setKw(e.target.value)}
        placeholder="搜索人物…"
        className="input search-input mb-2.5 w-full"
      />
      <div className="min-h-0 flex-1 overflow-auto" style={{ margin: '0 -6px' }}>
        {list.map(p => {
          const selected = pickedActors.includes(p.id)
          const url = personUrl(p.pid)
          return (
            <div
              key={p.id}
              onClick={() => pick(p.id)}
              className={`relative flex cursor-pointer items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] transition-colors ${selected ? 'bg-[var(--brand-soft)] font-semibold text-[var(--brand-fg)]' : 'hover:bg-[var(--hover-bg)]'}`}
            >
              {selected && <span className="absolute bottom-1 left-[-6px] top-1 w-[3px] rounded-r bg-[#6d7cff]" />}
              <Avatar name={p.name} src={p.avatar} size={26} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener"
                  title="打开来源页面"
                  onClick={e => e.stopPropagation()}
                  className="grid size-[22px] shrink-0 place-items-center rounded-md text-[var(--faint)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--brand-fg)]"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 5h5v5" /><path d="M19 5l-8 8" /><path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" />
                  </svg>
                </a>
              )}
              <span className="shrink-0 text-[11px] text-[var(--faint)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {p.rows}
              </span>
            </div>
          )
        })}
        {!list.length && <div className="py-8 text-center text-[12px] text-[var(--faint)]">无匹配人物</div>}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button className={`btn flex-1 justify-center !px-1 !text-[12.5px] ${multi ? 'on' : ''}`} onClick={toggleMulti}>多选</button>
        <button className="btn flex-1 justify-center !px-1 !text-[12.5px]"
          onClick={() => { setPickedActors(people.map(p => p.id)); onClose?.() }}>
          全选
        </button>
        <button className="btn flex-1 justify-center !px-1 !text-[12.5px]"
          onClick={() => { setPickedActors([]); onClose?.() }}>
          全部
        </button>
      </div>
    </>
  )
}

/** 面板外壳：宽屏 sticky 卡片；窄屏抽屉（open 时滑出） */
export function PersonPanelShell({ drawer, onClose }: { drawer: boolean; onClose: () => void }) {
  // 抽屉打开时锁滚动
  useEffect(() => {
    if (!drawer) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [drawer, onClose])

  return (
    <>
      {/* 宽屏 sticky 侧栏 */}
      <aside className="card fade-up sticky top-[68px] hidden max-h-[calc(100vh-84px)] w-[230px] shrink-0 flex-col p-3.5 lg:flex">
        <h2 className="mb-2.5 text-[12px] font-semibold tracking-wider text-[var(--muted)]">人物</h2>
        <PersonPanel />
      </aside>

      {/* 窄屏抽屉 */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
          <aside className="card fade-up fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col rounded-none !p-4 lg:hidden">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[12px] font-semibold tracking-wider text-[var(--muted)]">人物</h2>
              <button className="btn !min-h-7 !px-2 !py-0.5 !text-[12px]" onClick={onClose}>收起 ✕</button>
            </div>
            <PersonPanel open={drawer} onClose={onClose} />
          </aside>
        </>
      )}
    </>
  )
}
