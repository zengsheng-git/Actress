import { useFilterStore } from '../store'
import { sortArrow } from '../lib/filter'
import { makerBadgeStyle } from '../lib/color'
import type { WorkRow } from '../lib/parse'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Row = WorkRow & { actorName?: string }

/** 番号封面信息（服务端 /api/work 返回），按番号缓存避免重复请求 */
interface WorkInfo { cover: string; url: string; title: string; source?: 'javbus' | 'javdb' }
const workCache = new Map<string, Promise<WorkInfo | null>>()
function loadWork(code: string): Promise<WorkInfo | null> {
  if (!workCache.has(code)) {
    workCache.set(code, fetch(`/api/work?code=${encodeURIComponent(code)}`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null))
  }
  return workCache.get(code)!
}

/** 悬停番号时延迟弹出封面预览卡片（fixed 定位挂到 body，避免被表格滚动容器裁剪）。
 *  鼠标移出后有宽限期，移入卡片则取消隐藏，保证卡片内的链接可点击。 */
function CodePreview({ code, children }: { code: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [info, setInfo] = useState<WorkInfo | null | 'loading'>('loading')
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchor = useRef<HTMLSpanElement>(null)

  const updatePos = () => {
    const el = anchor.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cardH = 250
    const top = r.top - cardH - 8 < 8 ? r.bottom + 8 : r.top - cardH - 8
    setPos({ left: Math.min(Math.max(8, r.left), window.innerWidth - 196), top })
  }

  /** 进入番号或卡片：取消隐藏计时，延迟加载弹出 */
  const onEnter = () => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
    if (enterTimer.current || show) return
    enterTimer.current = setTimeout(async () => {
      enterTimer.current = null
      updatePos()
      setShow(true)
      setImgFailed(false)
      setInfo('loading')
      setInfo(await loadWork(code))
    }, 300)
  }

  /** 离开番号或卡片：取消加载计时，宽限期后隐藏（期间移入另一端则取消） */
  const onLeave = () => {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null }
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(() => {
      leaveTimer.current = null
      setShow(false)
    }, 200)
  }

  useEffect(() => () => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
  }, [])

  // 显示期间跟随滚动/缩放更新位置（capture 以捕获表格内部滚动）
  useEffect(() => {
    if (!show) return
    const onScroll = () => updatePos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [show])

  /** 点击番号：展开/收起卡片（触屏无悬停，点按代替） */
  const onClick = () => {
    if (show) { setShow(false); return }
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null }
    updatePos()
    setImgFailed(false)
    setShow(true)
    setInfo('loading')
    loadWork(code).then(i => setInfo(i))
  }

  return (
    <span ref={anchor} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}>
      {children}
      {show && pos && createPortal(
        <div
          className="card fixed z-50 w-44 !rounded-xl !p-2 fade-up"
          style={{ left: pos.left, top: pos.top }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          {info === 'loading' && (
            <div className="grid h-32 place-items-center">
              <span className="size-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#6d7cff]" />
            </div>
          )}
          {info === null && <div className="grid h-32 place-items-center text-[11px] text-[var(--faint)]">未找到该番号</div>}
          {info && info !== 'loading' && (
            <div>
              <a href={info.url} target="_blank" rel="noopener" className="block">
                {info.cover && !imgFailed
                  ? <img
                      src={info.cover}
                      alt={code}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full rounded-lg object-cover"
                      onError={() => setImgFailed(true)}
                    />
                  : (
                    <span className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-black/20 px-2 text-center text-[10px] leading-relaxed text-[var(--faint)]">
                      {info.cover ? '封面加载失败（图片站需代理访问）' : '无封面'}
                    </span>
                  )}
                {info.title && (
                  <span className="mt-1.5 block text-[11px] leading-snug text-[var(--fg-2)] line-clamp-2">{info.title}</span>
                )}
              </a>
              <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px]">
                <a href={info.url} target="_blank" rel="noopener" className="text-[var(--brand-fg)]">
                  {info.source === 'javbus' ? 'JavBus' : 'JavDB'} 详情页 ↗
                </a>
                <a
                  href={info.source === 'javbus' ? `https://javdb.com/search?q=${encodeURIComponent(code)}` : `https://www.javbus.com/${encodeURIComponent(code)}`}
                  target="_blank" rel="noopener"
                  className="text-[var(--faint)] transition-colors hover:text-[var(--brand-fg)]"
                >
                  {info.source === 'javbus' ? 'JavDB' : 'JavBus'} ↗
                </a>
                <a
                  href={`https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=${encodeURIComponent(code)}`}
                  target="_blank" rel="noopener"
                  className="text-[var(--faint)] transition-colors hover:text-[var(--brand-fg)]"
                >
                  JAVLibrary ↗
                </a>
                <a
                  href={`https://bt.nekomoe.net/search/${encodeURIComponent(code)}`}
                  target="_blank" rel="noopener"
                  className="text-[var(--faint)] transition-colors hover:text-[var(--brand-fg)]"
                >
                  猫咪BT ↗
                </a>
                <a
                  href={`https://sukebei.nyaa.si/?q=${encodeURIComponent(code)}`}
                  target="_blank" rel="noopener"
                  className="text-[var(--faint)] transition-colors hover:text-[var(--brand-fg)]"
                >
                  sukebei ↗
                </a>
              </span>
            </div>
          )}
        </div>,
        document.body
      )}
    </span>
  )
}

function CopyBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // 剪贴板 API 不可用（非安全上下文等）时退化为选区复制
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); copy() }}
      title={copied ? '已复制' : `复制番号：${code}`}
      className={`rounded border px-1 text-[10px] font-normal leading-4 transition-colors ${
        copied
          ? 'border-emerald-400/50 text-emerald-400'
          : 'border-[var(--line)] text-[var(--faint)] hover:border-[var(--brand)] hover:text-[var(--brand-fg)]'
      }`}
    >
      {copied ? '✓' : (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px]">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
    </button>
  )
}

function CodeLinks({ code }: { code: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <CodePreview code={code}><b>{code}</b></CodePreview>
      <CopyBtn code={code} />
    </span>
  )
}

/**
 * 作品明细表：表头排序 + 「加载更多」分页。
 * withActor：多人物对比时显示人物列（点击跳到人物详情）。
 */
export default function RecordTable({ rows, withActor }: { rows: Row[]; withActor: boolean }) {
  const { sortKey, sortDir, setSort, limit } = useFilterStore()
  const shown = rows.slice(0, limit)

  const th = (key: typeof sortKey, label: string, className = '') => (
    <th className={`sortable ${className}`} onClick={() => setSort(key)}>
      {label}
      <span className="text-[9px] opacity-50">{sortArrow(sortKey === key, sortDir)}</span>
    </th>
  )

  return (
    <div className="card fade-up p-4 md:p-5">
      <div className="tblbox">
        <table>
          <thead>
            <tr>
              {th('code', '番号')}
              {withActor && th('actor', '人物')}
              {th('mins', '片长', 'num')}
              {th('date', '发行')}
              {th('maker', '厂商')}
            </tr>
          </thead>
          <tbody>
            {shown.map((d, i) => (
              <tr key={`${d.actorName || ''}${d.code}${i}`}>
                <td data-label="番号" className="mono font-semibold text-[var(--fg)]"><CodeLinks code={d.code} /></td>
                {withActor && (
                  <td data-label="人物">
                    <a href={`#/person/${encodeURIComponent((d as Row & { actorId?: string }).actorId || '')}`}
                      className="text-[var(--brand-fg)] hover:underline">
                      {d.actorName}
                    </a>
                  </td>
                )}
                <td data-label="片长" className="num">{d.len || '-'}</td>
                <td data-label="发行" className="mono text-[var(--muted)]">{d.date}</td>
                <td data-label="厂商">
                  <span className="chip" style={makerBadgeStyle(d.maker)}>{d.maker}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="py-12 text-center text-[13px] text-[var(--faint)]">没有符合条件的记录</div>
        )}
      </div>

      {rows.length > limit && (
        <button
          className="btn mt-3 w-full justify-center border-dashed"
          onClick={() => useFilterStore.setState({ limit: limit + 100 })}
        >
          加载更多 · 已显示 {shown.length} / {rows.length}
        </button>
      )}
    </div>
  )
}
