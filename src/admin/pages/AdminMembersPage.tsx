import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { adminNavigate } from '@/admin/adminRouting'
import { AdminListSummary, AdminLoadMore } from '@/admin/components/AdminStatusTabs'
import { adminListMembers } from '@/services/admin'
import type { AdminMember } from '@/types'

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
    <div className="min-h-dvh bg-[#f5f5f9] pb-8 pt-[46px]">
      <div className="fixed top-0 z-[1000] w-full">
        <PageNavBar title="สมาชิก" variant="gradient" showBack backLabel="กลับ" onBack={onBack} />
      </div>

      <div className="bg-white px-3 py-2 ring-1 ring-black/5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อผู้ใช้..."
          className="w-full rounded-xl border border-[#ebedf0] bg-[#fafbfc] px-3 py-2.5 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20"
        />
      </div>

      <AdminListSummary
        loaded={search ? filtered.length : members.length}
        total={total}
        label={search ? 'พบ' : 'แสดง'}
      />

      {error && (
        <p className="mx-2.5 mt-2 rounded-lg bg-[#fff3f3] px-3 py-2 text-center text-sm text-[#ee0a24]">
          {error}
        </p>
      )}

      <ul className="mt-2.5 space-y-2 px-3">
        {filtered.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-sm font-semibold text-[#4e72f3]">{m.username}</div>
              <div className="text-xs text-[#969799]">{m.jointimeText}</div>
              <div className="mt-1 text-sm font-medium tabular-nums text-[#2c3345]">
                ยอดเงิน: {m.money.toLocaleString()} ฿
              </div>
            </div>
            <div className="ml-2 flex shrink-0 flex-col gap-1">
              <button
                type="button"
                className="rounded-full border border-[#ebedf0] px-2 py-1 text-[11px] font-medium text-[#535867] hover:bg-[#f8faff]"
                onClick={() =>
                  adminNavigate({ page: 'member-withdraw', memberId: m.id }, m.username)
                }
              >
                ถอนเงิน
              </button>
              <button
                type="button"
                className="rounded-full border border-[#ebedf0] px-2 py-1 text-[11px] font-medium text-[#535867] hover:bg-[#f8faff]"
                onClick={() =>
                  adminNavigate({ page: 'member-recharge', memberId: m.id }, m.username)
                }
              >
                ฝากเงิน
              </button>
              <button
                type="button"
                className="rounded-full bg-[#4e72f3] px-2 py-1 text-[11px] font-medium text-white"
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
        <p className="py-10 text-center text-sm text-[#888]">ไม่พบสมาชิก</p>
      )}
    </div>
  )
}
