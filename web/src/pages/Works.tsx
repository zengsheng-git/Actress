import { useEffect, useMemo, useState } from 'react'
import worksIndex from 'virtual:works-index'
import { people } from 'virtual:people-manifest'
import type { FlatRow } from '../lib/types'
import { applyFilters, download, fmtMins, sortRows, toCsv } from '../lib/filter'
import { getTsvRows, toFlatRows } from '../lib/javbusSource'
import { useFilterStore } from '../store'
import FilterBar from '../components/FilterBar'
import RecordTable from '../components/RecordTable'
import { MakerStat, ViewSwitch, YearStat } from '../components/StatViews'
import { PersonPanelShell } from '../components/PersonPanel'

export default function Works() {
  const s = useFilterStore()
  const [rows] = useState<FlatRow[]>(worksIndex)
  const [drawer, setDrawer] = useState(false)
  const [javbusRows, setJavbusRows] = useState<FlatRow[]>([])
  const [javbusLoading, setJavbusLoading] = useState(false)

  // 校验 localStorage 里的人物是否仍存在
  useEffect(() => {
    const valid = s.pickedActors.filter(id => people.some(p => p.id === id))
    if (valid.length !== s.pickedActors.length) s.setPickedActors(valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // JavBus 数据源：根据当前人物范围懒加载对应 JSON，人物归属用 JSON 自带的 actorId/name
  useEffect(() => {
    if (s.dataSource !== 'javbus') { setJavbusLoading(false); return }
    const ids = s.pickedActors.length ? s.pickedActors : people.map(p => p.id)
    let cancelled = false
    setJavbusLoading(true)
    getTsvRows(ids).then(datas => {
      if (cancelled) return
      setJavbusRows(datas.flatMap(toFlatRows))
      setJavbusLoading(false)
    })
    return () => { cancelled = true }
  }, [s.dataSource, s.pickedActors.join(',')])

  // 实际显示的源
  const isJavbus = s.dataSource === 'javbus'
  const isJavbusLoading = isJavbus && javbusLoading
  const isJavbusEmpty = isJavbus && !javbusLoading && javbusRows.length === 0
  const sourceRows = isJavbus && javbusRows.length ? javbusRows : rows
  const sourceBaseRows = useMemo(
    () => (s.pickedActors.length ? sourceRows.filter(r => s.pickedActors.includes(r.actorId)) : sourceRows),
    [sourceRows, s.pickedActors]
  )

  const filtered = useMemo(
    () => sortRows(
      applyFilters(sourceBaseRows, {
        makers: s.pickedMakers, kw: s.kw, year: s.year, minLen: s.minLen, mergeBD: s.mergeBD,
        section: isJavbus ? s.section : ''
      }),
      s.sortKey, s.sortDir
    ),
    [sourceBaseRows, s.pickedMakers, s.kw, s.year, s.minLen, s.mergeBD, s.section, isJavbus, s.sortKey, s.sortDir]
  )

  const span = useMemo(() => {
    const ys = filtered.map(r => r.year).filter(Boolean).sort()
    if (!ys.length) return '-'
    return ys[0] === ys[ys.length - 1] ? ys[0] : `${ys[0]} ~ ${ys[ys.length - 1]}`
  }, [filtered])

  const fsCount = useMemo(
    () => (s.pickedActors.length ? rows.filter(r => s.pickedActors.includes(r.actorId)).length : rows.length),
    [rows, s.pickedActors]
  )
  const javbusCount = javbusRows.length

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
        <div className="fade-up mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
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
            { k: '基准记录', v: sourceBaseRows.length },
            { k: '筛选结果', v: filtered.length, hl: true },
            { k: '总时长', v: fmtMins(filtered.reduce((s2, r) => s2 + r.mins, 0)), sm: true },
            { k: '厂商', v: new Set(sourceBaseRows.map((r: FlatRow) => r.maker)).size },
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

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white/[0.03] p-1">
            <button
              className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${s.dataSource === 'fouroursonsinc' ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
              onClick={() => s.setDataSource('fouroursonsinc')}
            >
              fouroursonsinc
              <span className="ml-1.5 rounded bg-black/20 px-1 text-[10px]" style={{ fontVariantNumeric: 'tabular-nums' }}>{fsCount}</span>
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${s.dataSource === 'javbus' ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
              onClick={() => s.setDataSource('javbus')}
              title="切换到 JavBus 数据（需要先跑过 fetch-works 脚本）"
            >
              JavBus
              {javbusCount > 0 && (
                <span className="ml-1.5 rounded bg-black/20 px-1 text-[10px]" style={{ fontVariantNumeric: 'tabular-nums' }}>{javbusCount}</span>
              )}
            </button>
          </div>
          <div className="flex-1"><FilterBar baseRows={sourceBaseRows} showActorSort showSection={isJavbus} onExport={exportCsv} /></div>
        </div>

        <ViewSwitch />
        {isJavbusLoading && (
          <div className="card mb-3 px-3.5 py-2.5 text-center text-[12px] text-[var(--muted)]">
            <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6d7cff] align-[-1px]" />
            正在加载 JavBus 数据…（首次切换会按需加载每个演员的 JSON）
          </div>
        )}
        {isJavbusEmpty && (
          <div className="card mb-3 px-3.5 py-2.5 text-center text-[12px] text-[var(--muted)]">
            当前人物还没有 JavBus 数据：可在导入后等待自动同步完成，或手动执行 <code className="mono">npm run works &lt;人物ID&gt;</code>
          </div>
        )}
        {s.view === 'rows' && <RecordTable rows={filtered} withActor={s.pickedActors.length !== 1} />}
        {s.view === 'maker' && <MakerStat rows={filtered} />}
        {s.view === 'year' && <YearStat rows={filtered} />}
      </div>
    </main>
  )
}
