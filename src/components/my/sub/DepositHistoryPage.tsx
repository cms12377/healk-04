import { useEffect, useState } from 'react'
import { ScrollRowHint, ScrollRowTableSkeleton } from '@/components/common/ScrollRowTable'
import { SubEmptyState, SubPageShell } from '@/components/my/sub/SubPageShell'
import { DepositHistoryTable } from '@/components/tables/MemberOrderTables'
import { getDepositOrders } from '@/services/wallet'

interface DepositHistoryPageProps {
  onBack: () => void
}

export function DepositHistoryPage({ onBack }: DepositHistoryPageProps) {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getDepositOrders>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getDepositOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SubPageShell title="ประวัติฝากเงิน" variant="white" onBack={onBack}>
      <ScrollRowHint />
      <div className="pb-4 pt-2">
        {loading && <ScrollRowTableSkeleton />}
        {!loading && orders.length === 0 && (
          <SubEmptyState title="ไม่มีรายการฝาก" subtitle="รายการฝากจะแสดงที่นี่หลังส่งคำขอ" />
        )}
        {!loading && orders.length > 0 && <DepositHistoryTable rows={orders} />}
      </div>
    </SubPageShell>
  )
}
