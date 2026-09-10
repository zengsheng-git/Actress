import { useEffect, useRef, useState } from 'react'
import { dotColor } from '../lib/color'

interface Opt { name: string; count?: number }

/**
 * 可搜索的多选下拉（厂商 / 人物通用）。
 * 打开面板显示搜索框 + 选项列表，收起后显示已选标签。
 */
export default function MultiSelect({
  label, options, picked, onChange
}: {
  label: string
  options: Opt[]
  picked: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [kw, setKw] = useState('')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (open && root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open])

  const shown = kw.trim()
    ? options.filter(o => o.name.toLowerCase().includes(kw.trim().toLowerCase()))
    : options

  const toggle = (name: string) =>
    onChange(picked.includes(name) ? picked.filter(x => x !== name) : [...picked, name])

  const triggerLabel = picked.length
    ? `已选 ${picked.length} / ${options.length} 个`
    : `全部（共 ${options.length} 个）`

  return (
    <div ref={root} className="relative min-w-0">
      <button type="button" className={`btn w-full justify-start ${picked.length ? 'on' : ''}`} onClick={() => setOpen(v => !v)}>
        {picked.length > 0 && (
          <i className="size-2 shrink-0 rounded-full" style={{ background: dotColor(picked[0]) }} />
        )}
        <span className="truncate">{label}：{triggerLabel}</span>
        <svg className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" width="11" height="11">
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2.5 shadow-2xl shadow-black/60 fade-up">
          <input
            autoFocus
            type="search"
            value={kw}
            onChange={e => setKw(e.target.value)}
            placeholder={`搜索${label}…`}
            className="input search-input w-full"
          />
          <div className="mt-2 max-h-[300px] overflow-auto rounded-lg border border-[var(--line)]">
            {shown.map(o => (
              <div
                key={o.name}
                className={`flex cursor-pointer items-center gap-2 px-2.5 py-[7px] text-[13px] transition-colors hover:bg-[var(--hover-bg)] ${picked.includes(o.name) ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : ''}`}
                onClick={() => toggle(o.name)}
              >
                <i className="size-[7px] shrink-0 rounded-full" style={{ background: dotColor(o.name) }} />
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.count !== undefined && (
                  <span className="text-[11px] text-[var(--faint)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.count}</span>
                )}
              </div>
            ))}
            {!shown.length && <div className="py-6 text-center text-[12px] text-[var(--faint)]">无匹配{label}</div>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="btn !min-h-[30px] !px-2.5 !text-[12.5px]"
              onClick={() => onChange([...new Set([...picked, ...shown.map(o => o.name)])])}>
              选中当前
            </button>
            <button type="button" className="btn !min-h-[30px] !px-2.5 !text-[12.5px]" onClick={() => onChange([])}>清空</button>
            <span className="grow" />
            <button type="button" className="btn btn-primary !min-h-[30px] !px-3 !text-[12.5px]" onClick={() => setOpen(false)}>完成</button>
          </div>
        </div>
      )}

      {!open && picked.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {picked.map(m => (
            <span
              key={m}
              title={`${m}（点击移除）`}
              onClick={() => toggle(m)}
              className="chip cursor-pointer border-[var(--line)] bg-[var(--btn-bg)] text-[var(--fg-2)] transition-colors hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-300"
            >
              <i className="size-[7px] rounded-full" style={{ background: dotColor(m) }} />
              {m}
              <i className="not-italic text-[var(--faint)]">×</i>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
