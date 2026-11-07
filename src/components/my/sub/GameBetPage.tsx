import { useCallback, useEffect, useState } from 'react'
import { FilterBar, PrimaryButton } from '@/components/common/PageNavBar'
import { ScrollRowHint } from '@/components/common/ScrollRowTable'
import {
  BetHistoryTable,
  BetHistoryTableSkeleton,
  type BetHistoryRowData,
} from '@/components/bet/BetHistoryTable'
import { SubEmptyState, SubPageShell } from '@/components/my/sub/SubPageShell'
import { BET_STATUS_OPTIONS, getBetRecordsPage } from '@/services/wallet'

interface GameBetPageProps {
  onBack: () => void
  initialStatus?: '0' | '1'
}

export function GameBetPage({ onBack, initialStatus = '0' }: GameBetPageProps) {
  const [status, setStatus] = useState<'0' | '1'>(initialStatus)
  const [records, setRecords] = useState<BetHistoryRowData[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const { records: batch, hasMore: more } = await getBetRecordsPage(status, pageNum)
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
    [status],
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
    <SubPageShell title="ประวัติการเดิมพัน" onBack={onBack}>
      <FilterBar
        options={BET_STATUS_OPTIONS}
        value={status}
        onChange={(v) => setStatus(v as '0' | '1')}
        variant="modern"
      />

      <ScrollRowHint />

      <div className="pb-4 pt-2">
        {loading && <BetHistoryTableSkeleton />}
        {!loading && records.length === 0 && (
          <SubEmptyState
            title="ไม่มีประวัติเดิมพัน"
            subtitle="รายการเดิมพันจะแสดงที่นี่หลังจากแทง"
          />
        )}
        {!loading && records.length > 0 && <BetHistoryTable rows={records} />}
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
