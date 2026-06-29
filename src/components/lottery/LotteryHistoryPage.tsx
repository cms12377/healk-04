import { useEffect, useMemo, useState } from 'react'
import { FilterBar, PageNavBar } from '@/components/common/PageNavBar'
import { GAME_LABELS } from '@/constants/assets'
import { fetchLotteries } from '@/services/api'
import { fetchDrawHistory } from '@/services/lottery'
import type { DrawRecord, LotteryItem } from '@/types'
import { cn } from '@/lib/utils'

interface LotteryHistoryPageProps {
  gameId: number
  code: string
  onBack: () => void
}

const VIEW_TABS = [
  { value: 'numbers', label: '号码' },
  { value: 'size', label: '大小' },
  { value: 'parity', label: '单双' },
  { value: 'sum', label: '冠亚' },
]

function Ball({ n, small }: { n: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded bg-[#3a81e5] font-bold text-white',
        small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm',
      )}
    >
      {n}
    </span>
  )
}

export function LotteryHistoryPage({ gameId, code: _code, onBack }: LotteryHistoryPageProps) {
  const [games, setGames] = useState<LotteryItem[]>([])
  const [selectedId, setSelectedId] = useState(gameId)
  const [viewTab, setViewTab] = useState('numbers')
  const [records, setRecords] = useState<DrawRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLotteries().then(setGames)
  }, [])

  useEffect(() => {
    setLoading(true)
    void fetchDrawHistory(selectedId, 20)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [selectedId])

  const gameOptions = useMemo(
    () =>
      games.map((g) => ({
        value: String(g.id),
        label: GAME_LABELS[g.code] ?? g.name,
      })),
    [games],
  )

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ประวัติผลรางวัล" showBack backLabel="กลับ" onBack={onBack} />

      {gameOptions.length > 0 && (
        <FilterBar
          options={gameOptions}
          value={String(selectedId)}
          onChange={(v) => setSelectedId(Number(v))}
        />
      )}

      <div className="border-b border-[#eee] bg-white px-3 py-2">
        <div className="flex gap-2 overflow-x-auto">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setViewTab(tab.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs',
                viewTab === tab.value
                  ? 'border-[#6298d6] bg-[#6298d6] text-white'
                  : 'border-[#ddd] bg-white text-[#333]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2.5">
        {loading && <p className="py-10 text-center text-sm text-[#888]">กำลังโหลด...</p>}
        {!loading && records.length === 0 && (
          <p className="py-10 text-center text-sm text-[#888]">ไม่มีประวัติผลในฐานข้อมูล</p>
        )}
        {records.map((row) => (
          <div
            key={row.id}
            className="mb-2 flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm"
          >
            <div className="shrink-0">
              <div className="text-sm font-semibold text-[#333]">{row.issue}</div>
              <div className="text-xs text-[#888]">{row.drawTime}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {viewTab === 'numbers' &&
                row.numbers.map((n, i) => <Ball key={`${row.id}-${i}`} n={n} small />)}
              {viewTab === 'size' &&
                row.numbers.slice(0, 3).map((n, i) => (
                  <span
                    key={i}
                    className={cn(
                      'rounded px-2 py-0.5 text-xs text-white',
                      Number(n) >= 5 ? 'bg-[#006cd5]' : 'bg-[#ffa735]',
                    )}
                  >
                    {Number(n) >= 5 ? '大' : '小'}
                  </span>
                ))}
              {viewTab === 'parity' &&
                row.numbers.slice(0, 3).map((n, i) => (
                  <span
                    key={i}
                    className={cn(
                      'rounded px-2 py-0.5 text-xs text-white',
                      Number(n) % 2 === 1 ? 'bg-[#006cd5]' : 'bg-[#ffa735]',
                    )}
                  >
                    {Number(n) % 2 === 1 ? '单' : '双'}
                  </span>
                ))}
              {viewTab === 'sum' && (
                <span className="text-sm font-semibold text-[#3a81e5]">
                  {row.numbers.slice(0, 2).reduce((s, n) => s + Number(n), 0)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
