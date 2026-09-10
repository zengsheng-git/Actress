import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** 图片灯箱：键盘 ←→/Esc，触屏左右滑动，点击背景关闭 */
export default function Lightbox({
  photos, index, onClose
}: {
  photos: string[]
  index: number
  onClose: () => void
}) {
  const [i, setI] = useState(index)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const prev = useCallback(() => setI(v => (v - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setI(v => (v + 1) % photos.length), [photos.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  const navBtn =
    'absolute top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white/10 text-white/85 backdrop-blur transition hover:bg-white/20'

  // 祖先卡片带入场动画（transform 会改变 fixed 的包含块），必须挂到 body 下
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={e => {
        if (!touch.current) return
        const dx = e.changedTouches[0].clientX - touch.current.x
        const dy = e.changedTouches[0].clientY - touch.current.y
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) (dx > 0 ? prev : next)()
        touch.current = null
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-[13px] text-white/70">
        <span className="mono">{i + 1} / {photos.length}</span>
        <button className="btn !min-h-8 !border-white/15 !bg-white/10 !px-2.5 !text-white/80" onClick={onClose}>关闭 ✕</button>
      </div>

      <div className="relative flex min-h-0 grow items-center justify-center px-4 pb-4" onClick={e => e.stopPropagation()}>
        <img
          key={photos[i]}
          src={photos[i]}
          alt={`照片 ${i + 1}`}
          className="fade-up max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        />
        {photos.length > 1 && (
          <>
            <button className={`${navBtn} left-2`} onClick={prev} aria-label="上一张">❮</button>
            <button className={`${navBtn} right-2`} onClick={next} aria-label="下一张">❯</button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
