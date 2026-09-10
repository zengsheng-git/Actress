import { useMemo } from 'react'
import type { WorkRow } from '../lib/parse'
import { yearCounts, makerCounts, fmtMins } from '../lib/filter'
import { makerBadgeStyle } from '../lib/color'

/**
 * 年份产出迷你柱状图：纵向 CSS 柱，悬停显示年份与条数。
 * 年份过多时自动抽样标注。
 */
export function MiniYearBars({ rows }: { rows: WorkRow[] }) {
  const years = useMemo(() => yearCounts(rows), [rows])
  const max = Math.max(1, ...years.map(([, n]) => n))
  if (!years.length) return <div className="py-4 text-center text-[12px] text-[var(--faint)]">暂无数据</div>

  // 年份太多时只标注首尾和中间几个刻度
  const labelEvery = Math.max(1, Math.ceil(years.length / 8))

  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]">
        {years.map(([y, n]) => (
          <div
            key={y}
            title={`${y} 年：${n} 部`}
            className="min-w-[3px] flex-1 rounded-t-[3px] bg-gradient-to-t from-[#5b6cff] to-[#8b5cf6] transition-all hover:opacity-75"
            style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] whitespace-nowrap text-[9px] leading-none text-[var(--faint)]">
        {years.map(([y], i) => (
          <div key={y} className="min-w-[3px] flex-1 text-center">
            {i % labelEvery === 0 || i === years.length - 1 ? y.slice(2) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 关键数字：总时长 / 平均 / 最长 */
export function DurationStats({ rows }: { rows: WorkRow[] }) {
  const { total, avg, max, maxRow } = useMemo(() => {
    let total = 0, max = 0
    let maxRow: WorkRow | null = null
    for (const r of rows) {
      total += r.mins
      if (r.mins > max) { max = r.mins; maxRow = r }
    }
    return { total, avg: rows.length ? total / rows.length : 0, max, maxRow }
  }, [rows])

  const items = [
    { k: '累计时长', v: fmtMins(total) },
    { k: '平均片长', v: rows.length ? fmtMins(avg) : '-' },
    {
      k: '单片最长',
      v: maxRow ? `${maxRow.code}（${fmtMins(max)}）` : '-',
      title: maxRow ? `${maxRow.code} · ${maxRow.date} · ${maxRow.maker}` : undefined
    }
  ]
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {items.map(it => (
        <div key={it.k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--line)] pb-2 last:border-0 last:pb-0">
          <span className="text-[12px] text-[var(--muted)]">{it.k}</span>
          <span className="truncate text-[13px] font-semibold text-[var(--fg)]" title={it.title}>{it.v}</span>
        </div>
      ))}
    </div>
  )
}

/** 合作厂商 Top N */
export function TopMakers({ rows, limit = 5 }: { rows: WorkRow[]; limit?: number }) {
  const stats = useMemo(() => {
    const all = makerCounts(rows)
    const top = all.slice(0, limit)
    const rest = all.slice(limit).reduce((s, [, n]) => s + n, 0)
    return { top, rest, max: Math.max(1, ...top.map(([, n]) => n)) }
  }, [rows, limit])

  if (!stats.top.length) return <div className="py-4 text-center text-[12px] text-[var(--faint)]">暂无数据</div>

  return (
    <div className="space-y-2">
      {stats.top.map(([maker, n]) => (
        <div key={maker} className="flex items-center gap-2.5">
          <span className="chip w-[118px] shrink-0 justify-start truncate !text-[11px]" style={makerBadgeStyle(maker)} title={maker}>
            {maker}
          </span>
          <span className="bar-wrap !max-w-none" style={{ width: 110 }}>
            <span className="bar" style={{ width: `${Math.max(3, (n / stats.max) * 100)}%` }} />
          </span>
          <span className="ml-auto text-[12px] text-[var(--muted)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
        </div>
      ))}
      {stats.rest > 0 && (
        <div className="pt-1 text-right text-[11px] text-[var(--faint)]">其余厂商共 {stats.rest} 部</div>
      )}
    </div>
  )
}
