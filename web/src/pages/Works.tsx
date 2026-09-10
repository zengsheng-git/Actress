import { useEffect, useMemo, useState } from 'react'
import worksIndex from 'virtual:works-index'
import { people } from 'virtual:people-manifest'
import type { FlatRow } from '../lib/types'
import { applyFilters, download, sortRows, toCsv } from '../lib/filter'
import { useFilterStore } from '../store'
import FilterBar from '../components/FilterBar'
import RecordTable from '../components/RecordTable'
import { MakerStat, ViewSwitch, YearStat } from '../components/StatViews'
import { PersonPanelShell } from '../components/PersonPanel'

export default function Works() {
  const s = useFilterStore()
  const [rows] = useState<FlatRow[]>(worksIndex)
  const [drawer, setDrawer] = useState(false)

  // 校验 localStorage 里的人物是否仍存在
  useEffect(() => {
    const valid = s.pickedActors.filter(id => people.some(p => p.id === id))
    if (valid.length !== s.pickedActors.length) s.setPickedActors(valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const baseRows = useMemo(
    () => (s.pickedActors.length ? rows.filter(r => s.pickedActors.includes(r.actorId)) : rows),
    [rows, s.pickedActors]
  )

  const filtered = useMemo(
    () => sortRows(
      applyFilters(baseRows, {
        makers: s.pickedMakers, kw: s.kw, year: s.year, minLen: s.minLen, mergeBD: s.mergeBD
      }),
      s.sortKey, s.sortDir
    ),
    [baseRows, s.pickedMakers, s.kw, s.year, s.minLen, s.mergeBD, s.sortKey, s.sortDir]
  )

  const span = useMemo(() => {
    const ys = filtered.map(r => r.year).filter(Boolean).sort()
    if (!ys.length) return '-'
    return ys[0] === ys[ys.length - 1] ? ys[0] : `${ys[0]} ~ ${ys[ys.length - 1]}`
  }, [filtered])

  const exportCsv = () => {
    const name = s.pickedActors.length === 1
      ? people.find(p => p.id === s.pickedActors[0])?.name || s.pickedActors[0]
      : 'export'
    download(`${name}.csv`, toCsv(filtered, s.pickedActors.length !== 1))
  }

  return (
    <main className="mx-auto flex max-w-[1400px] items-start gap-4 px-4 pb-16 pt-4 md:px-6">
      <PersonPanelShell drawer={drawer} onClose={() => setDrawer(false)} />

      <div className="min-w-0 flex-1">
        {/* 概览 */}
        <div className="fade-up mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="card !mb-0 flex items-center gap-2 px-3.5 py-2.5 sm:col-span-3 lg:col-span-1">
            <button className="btn !min-h-8 !px-2 !py-0.5 !text-[12px] lg:hidden" onClick={() => setDrawer(true)}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              人物
            </button>
            <div className="min-w-0">
              <div className="text-[11px] tracking-wider text-[var(--muted)]">当前范围</div>
              <div className="truncate text-[15px] font-semibold text-[var(--fg)]">
                {s.pickedActors.length ? `${s.pickedActors.length} 位人物` : '全部人物'}
              </div>
            </div>
          </div>
          {[
            { k: '人物', v: s.pickedActors.length || people.length },
            { k: '基准记录', v: baseRows.length },
            { k: '筛选结果', v: filtered.length, hl: true },
            { k: '厂商', v: new Set(baseRows.map(r => r.maker)).size },
            { k: '时间跨度', v: span, sm: true }
          ].map(t => (
            <div key={t.k} className={`card !mb-0 px-3.5 py-2.5 ${t.hl ? '!border-[rgba(109,124,255,0.4)] bg-gradient-to-b from-[rgba(109,124,255,0.1)] to-transparent' : ''}`}>
              <div className="text-[11px] tracking-wider text-[var(--muted)]">{t.k}</div>
              <div className={`truncate font-semibold text-[var(--fg)] ${t.sm ? 'text-[14px]' : 'text-lg'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {t.v}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3"><FilterBar baseRows={baseRows} showActorSort onExport={exportCsv} /></div>

        <ViewSwitch />
        {s.view === 'rows' && <RecordTable rows={filtered} withActor={s.pickedActors.length !== 1} />}
        {s.view === 'maker' && <MakerStat rows={filtered} />}
        {s.view === 'year' && <YearStat rows={filtered} />}
      </div>
    </main>
  )
}
