import { useCallback, useEffect, useState } from 'react'
import { FilterBar, PrimaryButton } from '@/components/common/PageNavBar'
import {
  ListSkeleton,
  RecordCard,
  SubEmptyState,
  SubPageShell,
} from '@/components/my/sub/SubPageShell'
import {
  DATE_RANGE_OPTIONS,
  formatTimestamp,
  getWalletRecordsPage,
  WALLET_CATEGORY_OPTIONS,
} from '@/services/wallet'
import type { DateRangeKey, WalletRecord } from '@/types'

interface WalletNotesPageProps {
  onBack: () => void
  initialCategory?: string
}

export function WalletNotesPage({ onBack, initialCategory = 'all' }: WalletNotesPageProps) {
  const [category, setCategory] = useState(initialCategory)
  const [dateRange, setDateRange] = useState<DateRangeKey>('last7Days')
  const [records, setRecords] = useState<WalletRecord[]>([])
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

      <div className="pb-4 pt-2">
        {loading && <ListSkeleton />}
        {!loading && records.length === 0 && (
          <SubEmptyState
            title="ไม่มีรายการธุรกรรม"
            subtitle="รายการจะแสดงเมื่อมีการฝาก ถอน หรือเดิมพัน"
          />
        )}
        {!loading &&
          records.map((item) => (
            <RecordCard key={item.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-[#2c3345]">{item.categoryLabel}</div>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div
                  className={`text-lg font-bold tabular-nums ${item.money >= 0 ? 'text-[#4e72f3]' : 'text-[#e53935]'}`}
                >
                  ฿{item.money >= 0 ? '+' : ''}
                  {item.money.toLocaleString()}
                </div>
                <div className="text-xs text-[#969799]">{formatTimestamp(item.createtime)}</div>
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
