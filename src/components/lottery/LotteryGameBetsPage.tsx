import { useCallback, useEffect, useState } from 'react'
import { PrimaryButton } from '@/components/common/PageNavBar'
import {
  ListSkeleton,
  RecordCard,
  SubEmptyState,
  SubPageShell,
} from '@/components/my/sub/SubPageShell'
import { GAME_LABELS } from '@/constants/assets'
import { formatTimestamp, getBetRecordsPage } from '@/services/wallet'
import type { BetRecord } from '@/types'
import { cn } from '@/lib/utils'

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

  const [records, setRecords] = useState<BetRecord[]>([])
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
      setRecords((prev) => (append ? [...prev, ...batch] : batch))
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

      <div className="pb-4 pt-2">
        {loading && <ListSkeleton />}
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
        {!loading &&
          records.map((item) => (
            <RecordCard key={item.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-[#2c3345]">
                  งวด <span className="font-normal text-[#969799]">{item.issue}</span>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    item.status === '1'
                      ? 'bg-[#e8f5e9] text-[#2e7d32]'
                      : 'bg-[#fff8e6] text-[#e65100]',
                  )}
                >
                  {item.statusText}
                </span>
              </div>
              <div className="mb-2 flex justify-between gap-2 text-xs text-[#646566]">
                <span className="min-w-0 truncate">{item.betContent}</span>
                <span
                  className={cn(
                    'shrink-0 font-medium',
                    item.isWin === '1' ? 'text-[#2e7d32]' : 'text-[#969799]',
                  )}
                >
                  {item.isWinText}
                </span>
              </div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-semibold tabular-nums text-[#2c3345]">
                  ฿{item.amount.toLocaleString()}
                </span>
                <span className="text-[#969799]">{item.categoryName}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-base font-bold tabular-nums text-[#4e72f3]">
                  ฿{item.winAmount > 0 ? item.winAmount.toLocaleString() : '-'}
                </span>
                <span className="text-xs text-[#969799]">{formatTimestamp(item.createtime)}</span>
              </div>
            </RecordCard>
          ))}
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
