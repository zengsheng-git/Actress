import { useMemo, useState } from 'react'
import { people } from 'virtual:people-manifest'
import PersonCard from '../components/PersonCard'

export default function Home() {
  const [kw, setKw] = useState('')

  const list = useMemo(() => {
    const k = kw.trim().toLowerCase()
    if (!k) return people
    return people.filter(p =>
      p.name.toLowerCase().includes(k) ||
      p.id.toLowerCase().includes(k) ||
      p.aliases.some(a => a.toLowerCase().includes(k))
    )
  }, [kw])

  const total = useMemo(() => people.reduce((s, p) => s + p.rows, 0), [])
  const totalPhotos = useMemo(() => people.reduce((s, p) => s + p.photos, 0), [])
  const withProfile = people.filter(p => p.hasProfile).length

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 md:px-6">
      {/* 品牌区 + 总览统计 */}
      <div className="fade-up mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-[var(--title-1)] via-[var(--title-2)] to-[var(--title-3)] bg-clip-text text-2xl font-bold tracking-wide text-transparent md:text-3xl">
            人物画廊
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {people.length} 位人物 · {total} 条记录{totalPhotos > 0 && ` · ${totalPhotos} 张照片`}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 md:w-[380px]">
          {[
            { k: '人物', v: people.length },
            { k: '记录', v: total },
            { k: '有资料', v: `${withProfile}/${people.length}` }
          ].map(s => (
            <div key={s.k} className="card !mb-0 px-3.5 py-2.5 text-center">
              <div className="text-lg font-semibold text-[var(--fg)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              <div className="text-[11px] tracking-wider text-[var(--muted)]">{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 搜索 */}
      <input
        type="search"
        value={kw}
        onChange={e => setKw(e.target.value)}
        placeholder="搜索人物…"
        className="input search-input fade-up mb-5 w-full md:max-w-sm"
      />

      {/* 人物卡片网格 */}
      {list.length ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {list.map((p, i) => (
            <PersonCard key={p.id} person={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="card py-16 text-center text-[13px] text-[var(--faint)]">无匹配人物</div>
      )}

      {!people.length && (
        <div className="card py-16 text-center text-[13px] text-[var(--muted)]">
          还没有数据：把原始页面 HTML 放进 <code className="mono">data/</code> 目录，文件名即为人物名。
        </div>
      )}
    </main>
  )
}
