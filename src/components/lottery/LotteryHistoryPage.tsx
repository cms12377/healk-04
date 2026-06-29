import { useEffect, useMemo, useState } from 'react'
import { FilterBar, PageNavBar } from '@/components/common/PageNavBar'
import { DrawResultView } from '@/components/lottery/game/BallViews'
import { GAME_LABELS } from '@/constants/assets'
import { HISTORY_TABS } from '@/lib/drawDisplay'
import { fetchLotteries } from '@/services/api'
import { fetchDrawHistory } from '@/services/lottery'
import { getGameType } from '@/services/lotteryUtils'
import type { DrawRecord, LotteryItem } from '@/types'
import { cn } from '@/lib/utils'

interface LotteryHistoryPageProps {
  gameId: number
  code: string
  onBack: () => void
}

export function LotteryHistoryPage({ gameId, code, onBack }: LotteryHistoryPageProps) {
  const [games, setGames] = useState<LotteryItem[]>([])
  const [selectedId, setSelectedId] = useState(gameId)
  const gameType = getGameType(code)
  const viewTabs = HISTORY_TABS[gameType]
  const [viewTab, setViewTab] = useState(viewTabs[0]?.value ?? '1')
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
          {viewTabs.map((tab) => (
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
            <div className="flex flex-1 flex-wrap items-center gap-1">
              <DrawResultView
                gameType={gameType}
                numbers={row.numbers}
                analyz={row.analyz}
                historyMode={viewTab}
                small
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
