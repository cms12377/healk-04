import { useEffect, useState } from 'react'
import {
  ListSkeleton,
  RecordCard,
  SubEmptyState,
  SubPageShell,
} from '@/components/my/sub/SubPageShell'
import { formatTimestamp, getDepositOrders } from '@/services/wallet'
import type { MemberDepositOrder } from '@/types'
import { cn } from '@/lib/utils'

interface DepositHistoryPageProps {
  onBack: () => void
}

export function DepositHistoryPage({ onBack }: DepositHistoryPageProps) {
  const [orders, setOrders] = useState<MemberDepositOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getDepositOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SubPageShell title="ประวัติฝากเงิน" variant="white" onBack={onBack}>
      <div className="pb-4 pt-2">
        {loading && <ListSkeleton />}
        {!loading && orders.length === 0 && (
          <SubEmptyState title="ไม่มีรายการฝาก" subtitle="รายการฝากจะแสดงที่นี่หลังส่งคำขอ" />
        )}
        {!loading &&
          orders.map((item) => (
            <RecordCard key={item.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-[#2c3345]">
                  {item.channelType === 'crypto' ? 'ฝากคริปโต' : 'ฝากเงิน'}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    item.status === 'approved'
                      ? 'bg-[#e8f5e9] text-[#2e7d32]'
                      : item.status === 'rejected'
                        ? 'bg-[#ffebee] text-[#c62828]'
                        : 'bg-[#fff8e6] text-[#e65100]',
                  )}
                >
                  {item.statusText}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="text-lg font-bold tabular-nums text-[#4e72f3]">
                  ฿{item.amount.toLocaleString()}
                </div>
                <div className="text-xs text-[#969799]">{formatTimestamp(item.createtime)}</div>
              </div>
              {item.payerName && (
                <p className="mt-1 text-xs text-[#969799]">ผู้โอน: {item.payerName}</p>
              )}
              {item.adminNote && (
                <p className="mt-1 text-xs text-[#e53935]">{item.adminNote}</p>
              )}
            </RecordCard>
          ))}
      </div>
    </SubPageShell>
  )
}
