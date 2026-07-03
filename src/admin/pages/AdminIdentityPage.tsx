import { useCallback, useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import {
  ADMIN_IDENTITY_FILTERS,
  AdminFilterBar,
  AdminLoadMore,
  formatAdminListSummary,
} from '@/admin/components/AdminStatusTabs'
import { AdminIdentityTable } from '@/components/tables/MemberOrderTables'
import { ScrollRowHint, ScrollRowTableSkeleton } from '@/components/common/ScrollRowTable'
import { adminListIdentity, adminReviewIdentity } from '@/services/admin'
import { cn } from '@/lib/utils'
import type { AdminIdentityRequest } from '@/types'

interface AdminIdentityPageProps {
  onBack: () => void
}

export function AdminIdentityPage({ onBack }: AdminIdentityPageProps) {
  const [items, setItems] = useState<AdminIdentityRequest[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || finished) return
    setLoading(true)
    setError('')
    try {
      const res = await adminListIdentity(page)
      setTotal(res.total)
      setItems((prev) => [...prev, ...res.data])
      setFinished(res.data.length < res.limit)
      setPage((p) => p + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [page, loading, finished])

  useEffect(() => {
    void loadMore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReview = async (userId: number, action: 'approve' | 'reject') => {
    if (actionId !== null) return
    setActionId(userId)
    setError('')
    try {
      await adminReviewIdentity(userId, action)
      setItems((prev) => prev.filter((i) => i.userId !== userId))
      setTotal((t) => Math.max(0, t - 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setActionId(null)
    }
  }

  return (
    <AdminPageLayout title="ยืนยันตัวตน" variant="gradient" showBack onBack={onBack}>
      <div className={cn(AD.banner, 'mx-3 mt-3 bg-[#eef2ff] text-[#4e72f3]')}>
        ตรวจสอบคำขอยืนยันตัวตน (KYC) ของสมาชิก
      </div>

      <AdminFilterBar
        label="กรองตามสถานะ KYC"
        options={ADMIN_IDENTITY_FILTERS}
        value="pending"
        onChange={() => {}}
        summary={formatAdminListSummary(items.length, total, 'รอตรวจ')}
      />
      <ScrollRowHint className={cn('mx-3 mt-2 text-sm', AD.hint)} />

      {error && (
        <p className="mx-3 mt-2 rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
          {error}
        </p>
      )}

      <div className="mt-2.5">
        {loading && items.length === 0 && (
          <ScrollRowTableSkeleton className="mx-0 rounded-none shadow-none ring-0" />
        )}
        {items.length > 0 && (
          <AdminIdentityTable
            rows={items}
            actionId={actionId}
            onReview={(id, action) => void handleReview(id, action)}
            className="mx-0 rounded-none shadow-none ring-0"
          />
        )}
      </div>

      <AdminLoadMore
        loading={loading}
        finished={finished}
        empty={!loading && items.length === 0}
        onLoadMore={() => void loadMore()}
      />
    </AdminPageLayout>
  )
}
