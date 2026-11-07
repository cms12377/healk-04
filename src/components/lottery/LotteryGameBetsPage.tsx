import { useCallback, useEffect, useState } from 'react'
import { PrimaryButton } from '@/components/common/PageNavBar'
import { ScrollRowHint } from '@/components/common/ScrollRowTable'
import {
  BetHistoryTable,
  BetHistoryTableSkeleton,
  type BetHistoryRowData,
} from '@/components/bet/BetHistoryTable'
import { SubEmptyState, SubPageShell } from '@/components/my/sub/SubPageShell'
import { GAME_LABELS } from '@/constants/assets'
import { getBetRecordsPage } from '@/services/wallet'

interface LotteryGameBetsPageProps {
  mode: 'orders' | 'settled'
  gameId: number
  code: string
  issue?: string
  onBack: () => void
}

export function LotteryGameBetsPage({
  mode,
  gameId,
  code,
  issue,
  onBack,
}: LotteryGameBetsPageProps) {
  const status = mode === 'orders' ? '0' : '1'
  const title = mode === 'orders' ? 'โพยรอผล' : 'โพยออกผลแล้ว'
  const gameTitle = GAME_LABELS[code] ?? code

  const [records, setRecords] = useState<BetHistoryRowData[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const { records: batch, hasMore: more } = await getBetRecordsPage(status, pageNum, {
        gamesId: gameId,
        issue,
      })
      const rows: BetHistoryRowData[] = batch.map((item) => ({
        id: item.id,
        status: item.status,
        isWin: item.isWin,
        gamesName: item.gamesName,
        issue: item.issue,
        betContent: item.betContent,
        categoryName: item.categoryName,
        amount: item.amount,
        winAmount: item.winAmount,
        createtime: item.createtime,
      }))
      setRecords((prev) => (append ? [...prev, ...rows] : rows))
      setHasMore(more)
      setPage(pageNum)
    },
    [status, gameId, issue],
  )

  useEffect(() => {
    setLoading(true)
    void loadPage(0, false)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [loadPage])

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      await loadPage(page + 1, true)
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <SubPageShell title={title} variant="white" onBack={onBack}>
      <p className="mx-3 mt-2 text-center text-xs text-[#969799]">
        {gameTitle}
        {issue ? ` · งวด ${issue}` : ''}
      </p>
      <ScrollRowHint />

      <div className="pb-4 pt-2">
        {loading && <BetHistoryTableSkeleton />}
        {!loading && records.length === 0 && (
          <SubEmptyState
            title={mode === 'orders' ? 'ไม่มีโพยรอผล' : 'ไม่มีโพยที่ออกผลแล้ว'}
            subtitle={
              mode === 'orders'
                ? 'รายการที่แทงในเกมนี้จะแสดงที่นี่'
                : 'โพยที่ settle แล้วจะแสดงที่นี่'
            }
          />
        )}
        {!loading && records.length > 0 && (
          <BetHistoryTable rows={records} showGame={false} />
        )}
        {!loading && hasMore && (
          <div className="mx-3 mt-3">
            <PrimaryButton onClick={() => void loadMore()}>
              {loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่ม'}
            </PrimaryButton>
          </div>
        )}
      </div>
    </SubPageShell>
  )
}
