import { Link } from 'react-router-dom'
import type { PersonMeta } from '../lib/types'
import Avatar from './Avatar'

/** 首页人物卡片 */
export default function PersonCard({ person, index }: { person: PersonMeta; index: number }) {
  return (
    <Link
      to={`/person/${encodeURIComponent(person.id)}`}
      className="card group block overflow-hidden transition-transform duration-200 hover:-translate-y-1 fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      {/* 封面：有头像用头像大图，否则渐变底 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {person.avatar ? (
          <img
            src={person.avatar}
            alt={person.name}
            loading="lazy"
            className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="size-full" style={{ background: 'var(--cover-bg)' }}>
            <span className="grid size-full place-items-center text-5xl font-bold text-white/10">{person.name.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,13,20,0.88)] via-transparent to-transparent" />
        {/* 资料角标 */}
        {(person.photos > 0 || person.video) && (
          <div className="absolute right-2.5 top-2.5 flex gap-1.5">
            {person.photos > 0 && (
              <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white/85 backdrop-blur">
                照片 {person.photos}
              </span>
            )}
            {person.video && (
              <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white/85 backdrop-blur">视频</span>
            )}
          </div>
        )}
        <div className="absolute bottom-2.5 left-3 right-3">
          <div className="truncate text-[15px] font-semibold text-white">{person.name}</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Avatar name={person.name} src={person.avatar} size={26} />
        <span className="text-[12px] text-[var(--muted)]">
          <b className="mr-0.5 font-semibold text-[var(--brand-fg-2)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{person.rows}</b>
          条记录
        </span>
        <span className="grow" />
        {person.hasProfile && (
          <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[11px] text-[var(--brand-fg)]">有资料</span>
        )}
      </div>
    </Link>
  )
}
