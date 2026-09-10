import { useState } from 'react'
import Lightbox from './Lightbox'

/** 照片墙：网格布局，点击进灯箱 */
export default function Gallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!photos.length) return null

  return (
    <section className="card fade-up p-4 md:p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold tracking-wider text-[var(--muted)]">照片</h2>
        <span className="text-[12px] text-[var(--faint)]">{photos.length} 张</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {photos.map((src, i) => (
          <button
            key={src}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--line)]"
            onClick={() => setOpen(i)}
          >
            <img
              src={src}
              alt={`照片 ${i + 1}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
