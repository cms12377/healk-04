import { useCallback, useEffect, useState } from 'react'
import { FilterBar, PrimaryButton } from '@/components/common/PageNavBar'
import { ScrollRowHint, ScrollRowTableSkeleton } from '@/components/common/ScrollRowTable'
import { SubEmptyState, SubPageShell } from '@/components/my/sub/SubPageShell'
import { WalletNotesTable } from '@/components/tables/MemberOrderTables'
import {
  DATE_RANGE_OPTIONS,
  getWalletRecordsPage,
  WALLET_CATEGORY_OPTIONS,
} from '@/services/wallet'
import type { DateRangeKey } from '@/types'

interface WalletNotesPageProps {
  onBack: () => void
  initialCategory?: string
}

export function WalletNotesPage({ onBack, initialCategory = 'all' }: WalletNotesPageProps) {
  const [category, setCategory] = useState(initialCategory)
  const [dateRange, setDateRange] = useState<DateRangeKey>('last7Days')
  const [records, setRecords] = useState<Awaited<ReturnType<typeof getWalletRecordsPage>>['records']>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const { records: batch, hasMore: more } = await getWalletRecordsPage(
        category,
        dateRange,
        pageNum,
      )
      setRecords((prev) => (append ? [...prev, ...batch] : batch))
      setHasMore(more)
      setPage(pageNum)
    },
    [category, dateRange],
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
    <SubPageShell title="บันทึกธุรกรรม" onBack={onBack}>
      <FilterBar
        options={WALLET_CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
        variant="modern"
      />
      <FilterBar
        options={DATE_RANGE_OPTIONS}
        value={dateRange}
        onChange={(v) => setDateRange(v as DateRangeKey)}
        variant="modern"
      />
      <ScrollRowHint />

      <div className="pb-4 pt-2">
        {loading && <ScrollRowTableSkeleton />}
        {!loading && records.length === 0 && (
          <SubEmptyState
            title="ไม่มีรายการธุรกรรม"
            subtitle="รายการจะแสดงเมื่อมีการฝาก ถอน หรือเดิมพัน"
          />
        )}
        {!loading && records.length > 0 && <WalletNotesTable rows={records} />}
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
