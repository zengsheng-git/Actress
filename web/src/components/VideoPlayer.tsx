/** 视频播放区：原生 controls + 海报图，仅元数据预载节省流量 */
export default function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  return (
    <section className="card fade-up p-4 md:p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold tracking-wider text-[var(--muted)]">视频</h2>
      </div>
      <video
        className="aspect-video w-full rounded-xl bg-black object-contain"
        controls
        preload="metadata"
        poster={poster}
        src={src}
      />
    </section>
  )
}
