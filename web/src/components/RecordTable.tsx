import { useFilterStore } from '../store'
import { sortArrow } from '../lib/filter'
import { makerBadgeStyle } from '../lib/color'
import type { WorkRow } from '../lib/parse'
import { useState } from 'react'

type Row = WorkRow & { actorName?: string; section?: 'censored' | 'uncensored' }

function CopyBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // 剪贴板 API 不可用（非安全上下文等）时退化为选区复制
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); copy() }}
      title={copied ? '已复制' : `复制番号：${code}`}
      className={`rounded border px-1 text-[10px] font-normal leading-4 transition-colors ${
        copied
          ? 'border-emerald-400/50 text-emerald-400'
          : 'border-[var(--line)] text-[var(--faint)] hover:border-[var(--brand)] hover:text-[var(--brand-fg)]'
      }`}
    >
      {copied ? '✓' : (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px]">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
    </button>
  )
}

function CodeLinks({ code }: { code: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <b>{code}</b>
      <CopyBtn code={code} />
      <a
        href={`https://sukebei.nyaa.si/?q=${encodeURIComponent(code)}`}
        target="_blank" rel="noopener"
        title={`在 sukebei 搜索番号：${code}（海外站点，需代理访问）`}
        className="rounded border border-[var(--line)] px-1 text-[10px] font-normal leading-4 text-[var(--faint)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-fg)]"
      >
        磁力 ↗
      </a>
    </span>
  )
}

/**
 * 作品明细表：表头排序 + 「加载更多」分页。
 * withActor：多人物对比时显示人物列（点击跳到人物详情）。
 */
export default function RecordTable({ rows, withActor }: { rows: Row[]; withActor: boolean }) {
  const { sortKey, sortDir, setSort, limit } = useFilterStore()
  const shown = rows.slice(0, limit)

  const th = (key: typeof sortKey, label: string, className = '') => (
    <th className={`sortable ${className}`} onClick={() => setSort(key)}>
      {label}
      <span className="text-[9px] opacity-50">{sortArrow(sortKey === key, sortDir)}</span>
    </th>
  )

  return (
    <div className="card fade-up p-4 md:p-5">
      <div className="tblbox">
        <table>
          <thead>
            <tr>
              {th('code', '番号')}
              {withActor && th('actor', '人物')}
              {th('mins', '片长', 'num')}
              {th('date', '发行')}
              {th('maker', '厂商')}
            </tr>
          </thead>
          <tbody>
            {shown.map((d, i) => (
              <tr key={`${d.actorName || ''}${d.code}${i}`} className={(d as Row).section === 'uncensored' ? 'bg-rose-400/[0.04]' : ''}>
                <td data-label="番号" className="mono font-semibold text-[var(--fg)]">
                  <CodeLinks code={d.code} />
                  {(d as Row).section === 'uncensored' && (
                    <span className="ml-1.5 rounded border border-rose-400/30 px-1 text-[9px] font-normal text-rose-300">无码</span>
                  )}
                </td>
                {withActor && (
                  <td data-label="人物">
                    <a href={`#/person/${encodeURIComponent((d as Row & { actorId?: string }).actorId || '')}`}
                      className="text-[var(--brand-fg)] hover:underline">
                      {d.actorName}
                    </a>
                  </td>
                )}
                <td data-label="片长" className="num">{d.len || '-'}</td>
                <td data-label="发行" className="mono text-[var(--muted)]">{d.date}</td>
                <td data-label="厂商">
                  <span className="chip" style={makerBadgeStyle(d.maker)}>{d.maker}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="py-12 text-center text-[13px] text-[var(--faint)]">没有符合条件的记录</div>
        )}
      </div>

      {rows.length > limit && (
        <button
          className="btn mt-3 w-full justify-center border-dashed"
          onClick={() => useFilterStore.setState({ limit: limit + 100 })}
        >
          加载更多 · 已显示 {shown.length} / {rows.length}
        </button>
      )}
    </div>
  )
}
