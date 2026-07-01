import { useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { FilterBar, PageNavBar } from '@/components/common/PageNavBar'
import { DrawResultView } from '@/components/lottery/game/BallViews'
import { GAME_LABELS } from '@/constants/assets'
import { useLotteries } from '@/hooks/useLotteries'
import { HISTORY_TABS, issueShort } from '@/lib/drawDisplay'
import { fetchDrawHistory } from '@/services/lottery'
import { getGameType } from '@/services/lotteryUtils'
import type { DrawRecord } from '@/types'
import { cn } from '@/lib/utils'

interface LotteryHistoryPageProps {
  gameId: number
  code: string
  onBack: (selected?: { id: number; code: string }) => void
}

function HistorySkeleton() {
  return (
    <div className="mx-3 mt-3 animate-pulse space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
          <div className="h-10 w-16 rounded bg-gray-100" />
          <div className="h-8 flex-1 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function LotteryHistoryPage({ gameId, code, onBack }: LotteryHistoryPageProps) {
  const { lotteries: games } = useLotteries()
  const [selectedId, setSelectedId] = useState(gameId)
  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedId),
    [games, selectedId],
  )
  const effectiveCode = selectedGame?.code ?? code
  const gameType = getGameType(effectiveCode)
  const viewTabs = HISTORY_TABS[gameType]
  const [viewTab, setViewTab] = useState(viewTabs[0]?.value ?? '1')
  const [records, setRecords] = useState<DrawRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSelectedId(gameId)
  }, [gameId])

  useEffect(() => {
    const tabs = HISTORY_TABS[getGameType(selectedGame?.code ?? code)]
    setViewTab(tabs[0]?.value ?? '1')
  }, [selectedGame?.code, code])

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
    <div className="min-h-dvh bg-[#f5f5f9] pb-6">
      <PageNavBar
        title="ประวัติผลรางวัล"
        variant="gradient"
        showBack
        backLabel="กลับ"
        onBack={() => onBack({ id: selectedId, code: effectiveCode })}
      />

      {gameOptions.length > 0 && (
        <FilterBar
          options={gameOptions}
          value={String(selectedId)}
          onChange={(v) => setSelectedId(Number(v))}
          variant="modern"
        />
      )}

      <div className="border-b border-gray-100 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 shrink-0 text-[#969799]" strokeWidth={2.2} aria-hidden />
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {viewTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setViewTab(tab.value)}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition',
                  viewTab === tab.value
                    ? 'bg-[#4e72f3] text-white shadow-sm'
                    : 'bg-white text-[#646566] ring-1 ring-[#ebedf0] hover:bg-[#f0f4ff]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-4 pt-2">
        {loading && <HistorySkeleton />}
        {!loading && records.length === 0 && (
          <div className="mx-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
            <History className="mx-auto h-10 w-10 text-[#c8c9cc]" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-[#646566]">ยังไม่มีประวัติผล</p>
            <p className="mt-1 text-xs text-[#969799]">ผลรางวัลจะแสดงที่นี่เมื่อมีการออกรางวัล</p>
          </div>
        )}
        {!loading &&
          records.map((row) => (
            <div
              key={row.id}
              className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5"
            >
              <div className="w-[72px] shrink-0 text-center">
                <div className="text-xs font-semibold tabular-nums text-[#4e72f3]">
                  {issueShort(row.issue)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#969799]">{row.drawTime}</div>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto">
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
