import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadPerson, people } from 'virtual:people-manifest'
import type { PersonData } from '../lib/parse'
import { applyFilters, download, sortRows, toCsv } from '../lib/filter'
import { personUrl } from '../lib/color'
import { useFilterStore } from '../store'
import Avatar from '../components/Avatar'
import Gallery from '../components/Gallery'
import VideoPlayer from '../components/VideoPlayer'
import FilterBar from '../components/FilterBar'
import RecordTable from '../components/RecordTable'

export default function Person() {
  const { id } = useParams()
  const meta = people.find(p => p.id === id)
  const [person, setPerson] = useState<PersonData | null>(null)

  useEffect(() => {
    let alive = true
    setPerson(null)
    if (id) loadPerson(id).then(p => { if (alive) setPerson(p) })
    return () => { alive = false }
  }, [id])

  const s = useFilterStore()

  // 详情页不沿用 /works 的人物多选
  useEffect(() => {
    if (s.pickedActors.length) s.setPickedActors([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const rows = useMemo(() => {
    if (!person) return []
    const filtered = applyFilters(person.rows, {
      makers: s.pickedMakers, kw: s.kw, year: s.year, minLen: s.minLen, mergeBD: s.mergeBD
    })
    return sortRows(filtered, s.sortKey, s.sortDir)
  }, [person, s.pickedMakers, s.kw, s.year, s.minLen, s.mergeBD, s.sortKey, s.sortDir])

  if (!meta) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-20 text-center">
        <p className="text-[var(--muted)]">未找到人物。</p>
        <Link to="/" className="btn mt-4 inline-flex">返回首页</Link>
      </main>
    )
  }

  if (!person) {
    return (
      <main className="grid place-items-center py-32">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6d7cff]" />
      </main>
    )
  }

  const srcUrl = personUrl(person.pid)
  const infoEntries = Object.entries(person.info)
  // 封面背景优先用照片，无照片时用头像，保证封面视觉统一
  const coverSrc = person.photos[0] || person.avatar
  const hasCover = Boolean(coverSrc)
  const years = person.rows.map(r => r.year).filter(Boolean).sort()
  const span = years.length ? (years[0] === years[years.length - 1] ? years[0] : `${years[0]} ~ ${years[years.length - 1]}`) : '-'

  const exportCsv = () => {
    download(`${person.name}.csv`, toCsv(rows, false))
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-4 md:px-6">
      {/* 封面：照片做背景 + 渐变遮罩；无照片时回退普通卡片底 */}
      <div className="card fade-up relative mb-4 overflow-hidden">
        {hasCover && (
          <div className="absolute inset-0">
            <img src={coverSrc} alt="" className="size-full scale-110 object-cover object-[center_20%] blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#10141f] via-[rgba(16,20,31,0.8)] to-[rgba(16,20,31,0.55)]" />
          </div>
        )}
        <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-end md:gap-6 md:p-7">
          <Avatar name={person.name} src={person.avatar} size={104} className="!rounded-2xl ring-2 ring-white/25" />
          <div className="min-w-0 md:pb-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={`text-2xl font-bold tracking-wide ${hasCover ? 'text-white' : 'text-[var(--fg)]'}`}>{person.name}</h1>
              {srcUrl && (
                <a href={srcUrl} target="_blank" rel="noopener"
                  className={`btn !min-h-7 !px-2 !py-0.5 !text-[12px] ${hasCover ? '!border-white/25 !bg-white/10 !text-white/85 hover:!bg-white/20' : ''}`}>
                  来源页
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 5h5v5" /><path d="M19 5l-8 8" /><path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" />
                  </svg>
                </a>
              )}
            </div>
            <p className={`mt-1 text-[13px] ${hasCover ? 'text-white/75' : 'text-[var(--fg-2)]'}`}>
              <b className={hasCover ? 'text-white' : 'text-[var(--fg)]'} style={{ fontVariantNumeric: 'tabular-nums' }}>{person.rows.length}</b> 条记录
              <span className={`mx-1.5 ${hasCover ? 'text-white/40' : 'text-[var(--faint)]'}`}>·</span>时间跨度 {span}
              {person.info['年龄'] && <><span className={`mx-1.5 ${hasCover ? 'text-white/40' : 'text-[var(--faint)]'}`}>·</span>{person.info['年龄']} 岁</>}
            </p>
          </div>
        </div>
      </div>

      {/* 基础资料 + 介绍 */}
      {infoEntries.length > 0 && (
        <section className="card fade-up mb-4 p-4 md:p-5">
          <h2 className="mb-3 text-[13px] font-semibold tracking-wider text-[var(--muted)]">资料</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {infoEntries.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <div className="text-[11px] tracking-wider text-[var(--faint)]">{k}</div>
                <div className="truncate text-[13px] text-[var(--fg)]" title={v}>{v}</div>
              </div>
            ))}
          </div>
          {person.description && <Description text={person.description} />}
        </section>
      )}
      {infoEntries.length === 0 && person.description && (
        <section className="card fade-up mb-4 p-4 md:p-5">
          <Description text={person.description} />
        </section>
      )}

      {/* 照片墙 + 视频 */}
      {(person.photos.length > 0 || person.video) && (
        <div className="mb-4 grid gap-4 lg:grid-cols-5">
          {person.photos.length > 0 && (
            <div className="lg:col-span-3"><Gallery photos={person.photos} /></div>
          )}
          {person.video && (
            <div className="lg:col-span-2"><VideoPlayer src={person.video.src} poster={person.video.poster} /></div>
          )}
        </div>
      )}

      {/* 作品 */}
      <h2 className="fade-up mb-3 mt-6 text-[13px] font-semibold tracking-wider text-[var(--muted)]">
        作品
        <span className="ml-2 font-normal text-[var(--faint)]">
          筛选结果 {rows.length} / {person.rows.length}
          <span className="mx-1.5">·</span>
          厂商 {new Set(rows.map(r => r.maker)).size} 个
        </span>
      </h2>
      <div className="mb-3"><FilterBar baseRows={person.rows} onExport={exportCsv} /></div>
      <RecordTable rows={rows} withActor={false} />
    </main>
  )
}

/** 介绍文字：长文折叠展开 */
function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const paras = text.split('\n\n')
  const long = paras.length > 3 || text.length > 320
  return (
    <div className={`mt-4 border-t border-dashed border-[var(--line)] pt-3 ${open ? '' : 'relative overflow-hidden'}`}
      style={open ? undefined : { maxHeight: 148 }}>
      <div className="space-y-2.5 text-[13px] leading-relaxed text-[var(--fg-2)]">
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {!open && long && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--panel)] to-transparent" />
          <button className="btn absolute bottom-0 left-1/2 -translate-x-1/2 !text-[12px]"
            onClick={() => setOpen(true)}>展开全部介绍 ▾</button>
        </>
      )}
      {open && long && (
        <button className="btn mt-3 !text-[12px]" onClick={() => setOpen(false)}>收起 ▴</button>
      )}
    </div>
  )
}
