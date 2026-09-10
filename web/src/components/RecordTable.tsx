import { useFilterStore } from '../store'
import { sortArrow } from '../lib/filter'
import { makerBadgeStyle } from '../lib/color'
import type { WorkRow } from '../lib/parse'

type Row = WorkRow & { actorName?: string }

/** 番号外链：点击跳到各资源站搜索该番号 */
const CODE_SITES = [
  { k: '猫', title: '猫咪BT', url: (c: string) => `https://bt.nekomoe.net/search/${encodeURIComponent(c)}` },
  { k: 'DB', title: 'JavDB', url: (c: string) => `https://javdb.com/search?q=${encodeURIComponent(c)}` },
  { k: 'NY', title: 'sukebei', url: (c: string) => `https://sukebei.nyaa.si/?q=${encodeURIComponent(c)}` },
  { k: 'JAV', title: 'JAVLibrary', url: (c: string) => `https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=${encodeURIComponent(c)}` }
]

function CodeLinks({ code }: { code: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {code}
      {CODE_SITES.map(s => (
        <a
          key={s.k}
          href={s.url(code)}
          target="_blank"
          rel="noopener"
          title={`${s.title} 搜索：${code}`}
          className="rounded border border-[var(--line)] px-1 text-[10px] font-normal leading-4 text-[var(--faint)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-fg)]"
        >
          {s.k}
        </a>
      ))}
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
