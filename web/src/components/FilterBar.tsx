import { useMemo } from 'react'
import { useFilterStore } from '../store'
import { makerCounts, normSearch, yearCounts } from '../lib/filter'
import type { WorkRow } from '../lib/parse'
import MultiSelect from './MultiSelect'
import { downloadSet, downloadNormSet } from 'virtual:download-set'

/** 是否视为已下载：原值优先，未命中再用归一化兜底（兼容 HEYZO/heyzo 等变体） */
function isDownloaded(code: string): boolean {
  return downloadSet.has(code) || downloadNormSet.has(normSearch(code))
}

/**
 * 筛选工具栏：人物多选（可选）+ 厂商多选 + 关键词 + 年份 + 时长 + 有码/无码（仅 JavBus 源）+ 排序 + 合并BD + 重置 + 导出。
 * 年份选项从传入的基准行里推导（人物页 = 该人物全部记录；全部作品页 = 当前选中人物的记录）。
 */
export default function FilterBar({
  baseRows, showActorSort, showSection, onExport
}: {
  baseRows: WorkRow[]
  /** 显示“人物”排序选项（多人物对比时才有意义） */
  showActorSort?: boolean
  /** 显示有码/无码筛选（仅 JavBus 数据源） */
  showSection?: boolean
  onExport?: () => void
}) {
  const s = useFilterStore()
  const years = yearCounts(baseRows).map(([y]) => y).reverse()
  const sectionCounts = useMemo(() => {
    let censored = 0, uncensored = 0
    for (const r of baseRows) {
      if ((r as { section?: string }).section === 'censored') censored++
      else if ((r as { section?: string }).section === 'uncensored') uncensored++
    }
    return { '': censored + uncensored, censored, uncensored }
  }, [baseRows])
  const downloadCounts = useMemo(() => {
    let dl = 0, miss = 0
    for (const r of baseRows) {
      if (isDownloaded(r.code)) dl++
      else miss++
    }
    return { all: baseRows.length, downloaded: dl, missing: miss }
  }, [baseRows])

  return (
    <div className="card fade-up relative z-10 p-4 md:p-5">
      <div className="grid gap-2.5 md:grid-cols-2">
        <MakerOpts baseRows={baseRows} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-[var(--line)] pt-3">
        <input
          type="search"
          value={s.kw}
          onChange={e => s.setKw(e.target.value)}
          placeholder="搜索番号或厂商…"
          className="input search-input min-w-[160px] flex-[1_1_170px]"
        />
        <select className="input" value={s.year} onChange={e => s.setYear(e.target.value)}>
          <option value="">全部年份</option>
          {years.map(y => <option key={y} value={y}>{y} 年</option>)}
        </select>
        <select className="input" value={s.minLen} onChange={e => s.setMinLen(Number(e.target.value))}>
          <option value={0}>全部时长</option>
          <option value={120}>≥120 分</option>
          <option value={240}>≥240 分</option>
          <option value={480}>≥480 分</option>
          <option value={960}>≥960 分</option>
        </select>
        <select
          className="input"
          value={`${s.sortKey}:${s.sortDir}`}
          onChange={e => {
            const [k, d] = e.target.value.split(':')
            useFilterStore.setState({ sortKey: k as typeof s.sortKey, sortDir: Number(d) as typeof s.sortDir })
          }}
        >
          <option value="date:-1">发行 ↓ 新→旧</option>
          <option value="date:1">发行 ↑ 旧→新</option>
          <option value="code:1">番号 A→Z</option>
          <option value="code:-1">番号 Z→A</option>
          <option value="mins:-1">片长 ↓</option>
          <option value="mins:1">片长 ↑</option>
          <option value="maker:1">厂商 A→Z</option>
          <option value="maker:-1">厂商 Z→A</option>
          {showActorSort && <option value="actor:1">人物 A→Z</option>}
        </select>
        <button className={`btn ${s.mergeBD ? 'on' : ''}`} onClick={s.toggleMergeBD}>合并 BD 重复版</button>
        {showSection && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-[var(--muted)]">类型</span>
            <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] p-0.5">
              {([
                ['', '全部'],
                ['censored', '有码'],
                ['uncensored', '无码']
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  className={`rounded-md px-2 py-0.5 text-[12px] transition-colors ${s.section === v ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
                  onClick={() => s.setSection(v)}
                >
                  {label}
                  <span className="ml-1 rounded bg-black/20 px-1 text-[10px]" style={{ fontVariantNumeric: 'tabular-nums' }}>{sectionCounts[v]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-[var(--muted)]">下载</span>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] p-0.5">
            {([
              ['all', '全部'],
              ['downloaded', '已下载'],
              ['missing', '未下载']
            ] as const).map(([v, label]) => (
              <button
                key={v}
                className={`rounded-md px-2 py-0.5 text-[12px] transition-colors ${s.downloadFilter === v ? 'bg-[var(--brand-soft)] text-[var(--brand-fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
                onClick={() => s.setDownloadFilter(v)}
                title={v === 'downloaded' ? '依据 works-export/download.json' : v === 'missing' ? '不在 download.json 中' : '全部'}
              >
                {label}
                <span className="ml-1 rounded bg-black/20 px-1 text-[10px]" style={{ fontVariantNumeric: 'tabular-nums' }}>{downloadCounts[v]}</span>
              </button>
            ))}
          </div>
        </div>
        <button className="btn" onClick={s.resetFilters}>重置</button>
        {onExport && (
          <button className="btn btn-primary" onClick={onExport}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
            </svg>
            导出 CSV
          </button>
        )}
      </div>
    </div>
  )
}

function MakerOpts({ baseRows }: { baseRows: WorkRow[] }) {
  const s = useFilterStore()
  const opts = makerCounts(baseRows).map(([name, count]) => ({ name, count }))
  return (
    <MultiSelect label="厂商" options={opts} picked={s.pickedMakers} onChange={ms => s.setMakers(ms)} />
  )
}
