import { useEffect, useState } from 'react'
import { FilterBar, PageNavBar } from '@/components/common/PageNavBar'
import { BET_STATUS_OPTIONS, formatTimestamp, getBetRecords } from '@/services/wallet'
import type { BetRecord } from '@/types'
import { cn } from '@/lib/utils'

interface GameBetPageProps {
  onBack: () => void
  initialStatus?: '0' | '1'
}

export function GameBetPage({ onBack, initialStatus = '0' }: GameBetPageProps) {
  const [status, setStatus] = useState<'0' | '1'>(initialStatus)
  const [records, setRecords] = useState<BetRecord[]>([])

  useEffect(() => {
    void getBetRecords(status).then(setRecords).catch(() => setRecords([]))
  }, [status])

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ประวัติการเดิมพัน" showBack backLabel="กลับ" onBack={onBack} />
      <FilterBar
        options={BET_STATUS_OPTIONS}
        value={status}
        onChange={(v) => setStatus(v as '0' | '1')}
      />
      <div className="list-scroller p-2.5">
        <div className="transaction-list">
          {records.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อมูล</p>
          ) : (
            records.map((item) => (
              <div key={item.id} className="list-item mb-2.5 rounded-md bg-white p-4">
                <div className="item-header mb-2 flex justify-between">
                  <div className="type text-base font-bold">
                    {item.gamesName} {item.issue}
                  </div>
                  <div
                    className={cn(
                      'status text-sm',
                      item.status === '1' ? 'text-green-600' : 'text-red-500',
                    )}
                  >
                    {item.statusText}
                  </div>
                </div>
                <div className="item-body mb-2 flex justify-between text-sm">
                  <span>{item.betContent}</span>
                  <span className={item.isWin === '1' ? 'text-green-600' : 'text-red-500'}>
                    {item.isWinText}
                  </span>
                </div>
                <div className="item-body mb-2 flex justify-between text-sm">
                  <span className="font-bold">฿{item.amount.toLocaleString()}</span>
                  <span className="text-[#888]">{item.categoryName}</span>
                </div>
                <div className="item-body flex justify-between">
                  <span className="amount text-lg font-bold text-[#427ffa]">
                    ฿{item.winAmount > 0 ? item.winAmount.toLocaleString() : '-'}
                  </span>
                  <span className="time text-sm text-[#888]">{formatTimestamp(item.createtime)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
