import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ImportResult {
  ok: boolean
  message?: string
  name?: string
  rows?: number
}

/** 从源站导入人物页到 data/（依赖 vite dev server 的 POST /api/import） */
export default function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setResult(null)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
      if (data.ok) setInput('')
    } catch {
      setResult({ ok: false, message: '请求失败：请确认 dev server 正在运行' })
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card fade-up w-full max-w-[400px] !bg-[var(--panel)] p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">导入人物</h2>
          <button className="btn !min-h-7 !px-2 !py-0.5 !text-[12px]" onClick={onClose}>关闭 ✕</button>
        </div>

        <p className="mb-3 text-[12px] leading-relaxed text-[var(--muted)]">
          输入源站人物 ID 或页面链接，自动抓取资料与作品列表存入 <code className="mono">data/</code>，页面随即自动刷新。
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

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>取消</button>
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
