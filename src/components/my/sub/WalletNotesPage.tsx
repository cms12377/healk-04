import { useEffect, useState } from 'react'
import { FilterBar, PageNavBar } from '@/components/common/PageNavBar'
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

  useEffect(() => {
    void getWalletRecords(category, dateRange).then(setRecords).catch(() => setRecords([]))
  }, [category, dateRange])

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="บันทึกธุรกรรม" showBack backLabel="กลับ" onBack={onBack} />
      <FilterBar
        options={WALLET_CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
      />
      <FilterBar
        options={DATE_RANGE_OPTIONS}
        value={dateRange}
        onChange={(v) => setDateRange(v as DateRangeKey)}
      />
      <div className="list-scroller p-2.5">
        <div className="transaction-list">
          {records.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อมูล</p>
          ) : (
            records.map((item) => (
              <div key={item.id} className="list-item mb-2.5 rounded-md bg-white p-4">
                <div className="item-header mb-2 flex justify-between">
                  <div className="type text-base font-bold">{item.categoryLabel}</div>
                  <div className="status text-sm text-[#427ffa]">สำเร็จ</div>
                </div>
                <div className="item-body flex justify-between">
                  <div
                    className={`amount text-lg font-bold ${item.money >= 0 ? 'text-[#427ffa]' : 'text-red-500'}`}
                  >
                    ฿{item.money >= 0 ? '+' : ''}
                    {item.money.toLocaleString()}
                  </div>
                  <div className="time text-sm text-[#888]">{formatTimestamp(item.createtime)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
