import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface JavbusTask {
  actorId: string
  status: 'running' | 'done' | 'error'
  stage: string
  done: number
  total: number
  startedAt: number
  finishedAt?: number
  error?: string
}

/**
 * 订阅 JavBus 抓取任务状态：挂载时一次性拉取 /api/javbus-status 初始值，
 * 之后由 dev server 通过 Vite WebSocket（javbus:task 事件）推送更新，不轮询。
 * 仅 dev 环境生效（build 产物没有 /api，直接不启用）。
 */
export function useJavbusTask(enabled: boolean, actorId?: string | null) {
  const [task, setTask] = useState<JavbusTask | null>(null)

  useEffect(() => {
    const hot = import.meta.hot
    if (!enabled || !hot) { setTask(null); return }
    let alive = true
    fetch('/api/javbus-status' + (actorId ? `?actor=${encodeURIComponent(actorId)}` : ''))
      .then(r => r.json())
      .then(d => { if (alive) setTask(d.tasks?.[0] ?? null) })
      .catch(() => { /* dev server 未运行等情况，忽略 */ })
    const onPush = (data: { task: JavbusTask }) => {
      if (!alive || !data?.task) return
      if (actorId && data.task.actorId !== actorId) return
      setTask(data.task)
    }
    hot.on('javbus:task', onPush)
    return () => { alive = false; hot.off('javbus:task', onPush) }
  }, [enabled, actorId])

  return task
}

/** 右下角全局进度角标：有 running 任务才出现 */
export function JavbusBadge() {
  const task = useJavbusTask(true)
  if (!task || task.status !== 'running') return null
  const pct = task.total ? Math.min(100, Math.round((task.done / task.total) * 100)) : null
  return createPortal(
    <div className="fade-up fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5 text-[12px] shadow-xl">
      <span className="size-3.5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6d7cff]" />
      <div className="leading-tight">
        <div className="font-medium">JavBus 抓取中：{task.actorId}</div>
        <div className="text-[11px] text-[var(--muted)]">
          {task.stage}{pct != null && task.total ? ` · ${task.done}/${task.total}（${pct}%）` : ''}
        </div>
      </div>
    </div>,
    document.body
  )
}

/** 完成态在 ImportDialog 里展示（含错误信息） */
export function JavbusStatusLine({ task }: { task: JavbusTask | null }) {
  if (!task || task.status === 'running') return null
  if (task.status === 'error') {
    return (
      <div className="mt-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-300">
        JavBus 抓取失败：{task.error || '未知错误'}（可稍后手动执行 npm run works {task.actorId} 重试）
      </div>
    )
  }
  return (
    <div className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-300">
      JavBus 作品已同步：{task.stage}
    </div>
  )
}
