import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { JavbusStatusLine, useJavbusTask } from './JavbusStatus'

interface ImportResult {
  ok: boolean
  message?: string
  id?: string
  name?: string
  rows?: number
  javbus?: { started: boolean }
}

/** 从源站导入人物页到 data/（依赖 vite dev server 的 POST /api/import）；成功后自动后台同步 JavBus 作品 */
export default function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [watchActor, setWatchActor] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setResult(null)
      setWatchActor(null)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 导入成功后：watchActor 非空时订阅该人物的 JavBus 抓取进度（WebSocket 推送，全局角标由 JavbusBadge 单独负责）
  const javbusTask = useJavbusTask(Boolean(open && watchActor), watchActor)

  if (!open) return null

  const submit = async () => {
    if (busy || !input.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const r = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: input.trim() })
      })
      const data: ImportResult = await r.json()
      setResult(data)
      if (data.ok) {
        setInput('')
        setWatchActor(data.id ?? null)
      }
    } catch {
      setResult({ ok: false, message: '请求失败：请确认 dev server 正在运行' })
    } finally {
      setBusy(false)
    }
  }

  const runningTask = javbusTask && javbusTask.status === 'running' ? javbusTask : null
  const pct = runningTask && runningTask.total ? Math.min(100, Math.round((runningTask.done / runningTask.total) * 100)) : null

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card fade-up w-full max-w-[400px] !bg-[var(--panel)] p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">导入人物</h2>
          <button className="btn !min-h-7 !px-2 !py-0.5 !text-[12px]" onClick={onClose}>关闭 ✕</button>
        </div>

        <p className="mb-3 text-[12px] leading-relaxed text-[var(--muted)]">
          输入源站人物 ID 或页面链接，自动抓取资料与作品列表存入 <code className="mono">data/</code>，随后在后台同步 JavBus 作品（需要本地代理开启）。
        </p>

        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="如：35 或 https://www.fouroursonsinc.com/person/35"
          className="input w-full"
          disabled={busy}
        />

        {result && (
          <div className={`mt-3 rounded-lg border px-3 py-2 text-[13px] fade-up ${result.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/30 bg-rose-400/10 text-rose-300'}`}>
            {result.ok
              ? <>已导入 <b>{result.name}</b>（{result.rows} 条记录），页面即将自动刷新…</>
              : result.message}
          </div>
        )}

        {runningTask && (
          <div className="mt-2 rounded-lg border border-[var(--line)] px-3 py-2 text-[12px] text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="size-3 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6d7cff]" />
              JavBus 同步中：{runningTask.stage}
              {pct != null && `（${pct}%）`}
            </div>
          </div>
        )}
        {watchActor && <JavbusStatusLine task={javbusTask} />}

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>{runningTask ? '后台运行' : '取消'}</button>
          <button className="btn btn-primary min-w-[84px] justify-center" onClick={submit} disabled={busy || !input.trim()}>
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : '导入'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
