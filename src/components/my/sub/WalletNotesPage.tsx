import { useEffect, useState } from 'react'
import { FilterBar } from '@/components/common/PageNavBar'
import {
  ListSkeleton,
  RecordCard,
  SubEmptyState,
  SubPageShell,
} from '@/components/my/sub/SubPageShell'
import {
  DATE_RANGE_OPTIONS,
  formatTimestamp,
  getWalletRecords,
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void getWalletRecords(category, dateRange)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [category, dateRange])

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
                <span className="shrink-0 rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-semibold text-[#2e7d32]">
                  สำเร็จ
                </span>
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
      </div>
    </SubPageShell>
  )
}
