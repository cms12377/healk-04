import { useCallback, useEffect, useMemo, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { adminNavigate } from '@/admin/adminRouting'
import { AdminListSummary, AdminLoadMore } from '@/admin/components/AdminStatusTabs'
import { adminListMembers } from '@/services/admin'
import { cn } from '@/lib/utils'
import type { AdminMember } from '@/types'

const IDENTITY_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'KYC รอ', className: 'bg-[#fff3e6] text-[#e65100]' },
  approved: { label: 'KYC ✓', className: 'bg-[#e8f5e9] text-[#2e7d32]' },
  rejected: { label: 'KYC ✗', className: 'bg-[#ffebee] text-[#c62828]' },
}

interface AdminMembersPageProps {
  onBack: () => void
}

export function AdminMembersPage({ onBack }: AdminMembersPageProps) {
  const [members, setMembers] = useState<AdminMember[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadMore = useCallback(async () => {
    if (loading || finished) return
    setLoading(true)
    setError('')
    try {
      const res = await adminListMembers(page)
      setTotal(res.total)
      setMembers((prev) => [...prev, ...res.data])
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.nickname.toLowerCase().includes(q),
    )
  }, [members, search])

  return (
    <AdminPageLayout title="สมาชิก" variant="gradient" showBack onBack={onBack}>
      <div className="bg-white px-3 py-3 ring-1 ring-black/5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อผู้ใช้..."
          className={cn(AD.input, 'border-[#ebedf0] bg-[#fafbfc] focus:ring-1 focus:ring-[#4e72f3]/20')}
        />
      </div>

      <AdminListSummary
        loaded={search ? filtered.length : members.length}
        total={total}
        label={search ? 'พบ' : 'แสดง'}
      />

      {error && (
        <p className="mx-3 mt-2 rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
          {error}
        </p>
      )}

      <ul className="mt-2.5 space-y-3 px-3">
        {filtered.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold text-[#4e72f3]">{m.username}</span>
                {m.identityStatus && IDENTITY_BADGE[m.identityStatus] && (
                  <span
                    className={cn(
                      AD.badge,
                      IDENTITY_BADGE[m.identityStatus].className,
                    )}
                  >
                    {IDENTITY_BADGE[m.identityStatus].label}
                  </span>
                )}
              </div>
              <div className={AD.subtitle}>{m.jointimeText}</div>
              {m.realName && (
                <div className={cn('mt-1', AD.body)}>ชื่อ: {m.realName}</div>
              )}
              <div className={cn('mt-2', AD.value)}>
                ยอดเงิน: {m.money.toLocaleString()} ฿
              </div>
            </div>
            <div className="ml-2 flex shrink-0 flex-col gap-2">
              <button
                type="button"
                className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867] hover:bg-[#f8faff]')}
                onClick={() =>
                  adminNavigate({ page: 'member-payment', memberId: m.id }, m.username)
                }
              >
                ช่องทางชำระ
              </button>
              <button
                type="button"
                className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867] hover:bg-[#f8faff]')}
                onClick={() =>
                  adminNavigate({ page: 'member-withdraw', memberId: m.id }, m.username)
                }
              >
                ถอนเงิน
              </button>
              <button
                type="button"
                className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867] hover:bg-[#f8faff]')}
                onClick={() =>
                  adminNavigate({ page: 'member-recharge', memberId: m.id }, m.username)
                }
              >
                ฝากเงิน
              </button>
              <button
                type="button"
                className={cn(AD.btnAction, 'bg-[#4e72f3] text-white')}
                onClick={() =>
                  adminNavigate({ page: 'member-bets', memberId: m.id }, m.username)
                }
              >
                เดิมพัน
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!search && (
        <AdminLoadMore
          loading={loading}
          finished={finished}
          empty={!loading && members.length === 0}
          onLoadMore={() => void loadMore()}
        />
      )}
      {search && filtered.length === 0 && !loading && (
        <p className="py-12 text-center text-base text-[#888]">ไม่พบสมาชิก</p>
      )}
    </AdminPageLayout>
  )
}
