import { useCallback, useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { AdminListSummary, AdminLoadMore } from '@/admin/components/AdminStatusTabs'
import { adminListIdentity, adminReviewIdentity } from '@/services/admin'
import { cn } from '@/lib/utils'
import type { AdminIdentityRequest } from '@/types'

interface AdminIdentityPageProps {
  onBack: () => void
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอตรวจ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  none: 'ยังไม่ยื่น',
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
        ตรวจสอบคำขอยืนยันตัวตน (KYC) ของสมาชิก — ตรงกับ th6688 identityCard
      </div>

      <AdminListSummary loaded={items.length} total={total} label="รอตรวจ" />

      {error && (
        <p className="mx-3 mt-2 rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
          {error}
        </p>
      )}

      <ul className="mt-2.5 space-y-3 px-3">
        {items.map((item) => (
          <li
            key={item.userId}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-[#4e72f3]">{item.username}</p>
                <p className={AD.subtitle}>{item.jointimeText}</p>
              </div>
              <span className={cn(AD.badge, 'bg-[#fff3e6] text-[#e65100]')}>
                {STATUS_LABEL[item.identityStatus] ?? item.identityStatus}
              </span>
            </div>

            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-4">
                <dt className={AD.label}>ชื่อจริง</dt>
                <dd className={cn('text-right', AD.value)}>{item.realName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={AD.label}>เลขบัตร/พาสปอร์ต</dt>
                <dd className={cn('break-all text-right', AD.value)}>{item.idNumber || '—'}</dd>
              </div>
            </dl>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={actionId === item.userId}
                className={cn(
                  AD.btnAction,
                  'flex-1 border border-[#ebedf0] text-[#535867] hover:bg-[#f8faff] disabled:opacity-50',
                )}
                onClick={() => void handleReview(item.userId, 'reject')}
              >
                ปฏิเสธ
              </button>
              <button
                type="button"
                disabled={actionId === item.userId}
                className={cn(
                  AD.btnAction,
                  'flex-1 bg-[#4e72f3] text-white disabled:opacity-50',
                )}
                onClick={() => void handleReview(item.userId, 'approve')}
              >
                {actionId === item.userId ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <AdminLoadMore
        loading={loading}
        finished={finished}
        empty={!loading && items.length === 0}
        onLoadMore={() => void loadMore()}
      />
    </AdminPageLayout>
  )
}
