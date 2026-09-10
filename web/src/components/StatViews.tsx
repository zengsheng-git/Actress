import { useMemo } from 'react'
import { useFilterStore } from '../store'
import { yearCounts } from '../lib/filter'
import { makerBadgeStyle } from '../lib/color'
import type { WorkRow } from '../lib/parse'

type Row = WorkRow & { actorId?: string; actorName?: string }

/** 厂商统计表：条数 / 占比条 / 人物数 / 最早最晚，点击行反向筛选 */
export function MakerStat({ rows }: { rows: Row[] }) {
  const setMakers = useFilterStore(s => s.setMakers)
  const setView = useFilterStore(s => s.setView)

  const stats = useMemo(() => {
    const cnt = new Map<string, { n: number; who: Set<string>; min: string; max: string }>()
    for (const d of rows) {
      const o = cnt.get(d.maker) || { n: 0, who: new Set(), min: '', max: '' }
      o.n++
      if (d.actorId) o.who.add(d.actorId)
      if (d.date) {
        if (!o.min || d.date < o.min) o.min = d.date
        if (!o.max || d.date > o.max) o.max = d.date
      }
      cnt.set(d.maker, o)
    }
    return [...cnt.entries()]
      .map(([maker, o]) => ({ maker, ...o, who: o.who.size, pct: rows.length ? (o.n / rows.length * 100).toFixed(1) + '%' : '0%' }))
      .sort((a, b) => b.n - a.n)
  }, [rows])

  const max = Math.max(1, ...stats.map(r => r.n))

  return (
    <div className="card fade-up p-4 md:p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold tracking-wider text-[var(--muted)]">厂商统计</h2>
        <span className="text-[12px] text-[var(--faint)]">点击行可筛选该厂商</span>
      </div>
      <div className="tblbox">
        <table>
          <thead>
            <tr><th>厂商</th><th className="num">条数</th><th>占比</th><th className="num">人物数</th><th>最早</th><th>最晚</th></tr>
          </thead>
          <tbody>
            {stats.map(r => (
              <tr key={r.maker} className="clickable" onClick={() => { setMakers([r.maker]); setView('rows') }}>
                <td data-label="厂商"><span className="chip" style={makerBadgeStyle(r.maker)}>{r.maker}</span></td>
                <td data-label="条数" className="num"><b>{r.n}</b></td>
                <td data-label="占比">
                  <span className="bar-wrap"><span className="bar" style={{ width: `${Math.max(2, (r.n / max) * 100)}%` }} /></span>
                  <span className="ml-2 text-[12px] text-[var(--muted)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.pct}</span>
                </td>
                <td data-label="人物数" className="num">{r.who || '-'}</td>
                <td data-label="最早" className="mono text-[var(--muted)]">{r.min || '-'}</td>
                <td data-label="最晚" className="mono text-[var(--muted)]">{r.max || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!stats.length && <div className="py-12 text-center text-[13px] text-[var(--faint)]">没有符合条件的记录</div>}
      </div>
    </div>
  )
}

/** 年份分布表：点击行反向筛选 */
export function YearStat({ rows }: { rows: Row[] }) {
  const setYear = useFilterStore(s => s.setYear)
  const setView = useFilterStore(s => s.setView)
  const stats = yearCounts(rows)
  const max = Math.max(1, ...stats.map(r => r[1]))
  const total = Math.max(1, rows.length)

  return (
    <div className="card fade-up p-4 md:p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold tracking-wider text-[var(--muted)]">年份分布</h2>
        <span className="text-[12px] text-[var(--faint)]">点击行可筛选该年份</span>
      </div>
      <div className="tblbox">
        <table>
          <thead>
            <tr><th>年份</th><th className="num">条数</th><th>分布</th></tr>
          </thead>
          <tbody>
            {stats.map(([y, n]) => (
              <tr key={y} className="clickable" onClick={() => { setYear(y); setView('rows') }}>
                <td data-label="年份" className="mono font-semibold">{y}</td>
                <td data-label="条数" className="num">{n}</td>
                <td data-label="分布">
                  <span className="bar-wrap"><span className="bar" style={{ width: `${(n / max) * 100}%` }} /></span>
                  <span className="ml-2 text-[12px] text-[var(--muted)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{(n / total * 100).toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!stats.length && <div className="py-12 text-center text-[13px] text-[var(--faint)]">没有符合条件的记录</div>}
      </div>
    </div>
  )
}

/** 视图切换分段控件 */
export function ViewSwitch() {
  const view = useFilterStore(s => s.view)
  const setView = useFilterStore(s => s.setView)
  const tabs = [
    { k: 'rows', t: '明细' },
    { k: 'maker', t: '厂商统计' },
    { k: 'year', t: '年份分布' }
  ] as const
  return (
    <div className="mb-3 grid grid-cols-3 rounded-xl border border-[var(--line)] bg-[var(--btn-bg)] p-1">
      {tabs.map(t => (
        <button
          key={t.k}
          className={`rounded-lg py-1.5 text-[13px] transition-colors ${view === t.k ? 'bg-[var(--brand-soft)] font-medium text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--brand-fg-2)]'}`}
          onClick={() => setView(t.k)}
        >
          {t.t}
        </button>
      ))}
    </div>
  )
}
