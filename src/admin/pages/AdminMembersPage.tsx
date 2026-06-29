import { useCallback, useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { adminNavigate } from '@/admin/adminRouting'
import { adminListMembers } from '@/services/admin'
import type { AdminMember } from '@/types'

interface AdminMembersPageProps {
  onBack: () => void
}

export function AdminMembersPage({ onBack }: AdminMembersPageProps) {
  const [members, setMembers] = useState<AdminMember[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)

  const loadMore = useCallback(async () => {
    if (loading || finished) return
    setLoading(true)
    try {
      const res = await adminListMembers(page)
      setMembers((prev) => [...prev, ...res.data])
      setFinished(res.data.length < res.limit)
      setPage((p) => p + 1)
    } catch {
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [page, loading, finished])

  useEffect(() => {
    void loadMore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5] pb-8">
      <PageNavBar title="จัดการสมาชิก" showBack onBack={onBack} />

      <ul className="space-y-2 p-2.5">
        {members.map((m) => (
          <li key={m.id} className="rounded-lg bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#333]">{m.username}</div>
                <div className="text-xs text-[#00BE7D]">{m.jointimeText}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#888]">ยอดเงิน</div>
                <div className="font-semibold text-[#148164]">{m.money.toLocaleString()} ฿</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded bg-[#427ffa] py-1.5 text-xs text-white"
                onClick={() =>
                  adminNavigate(
                    { page: 'member-withdraw', memberId: m.id },
                    m.username,
                  )
                }
              >
                ถอนเงิน
              </button>
              <button
                type="button"
                className="rounded bg-[#148164] py-1.5 text-xs text-white"
                onClick={() =>
                  adminNavigate({ page: 'member-recharge', memberId: m.id }, m.username)
                }
              >
                ฝากเงิน
              </button>
              <button
                type="button"
                className="rounded bg-[#ff983b] py-1.5 text-xs text-white"
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

      {loading && <p className="py-4 text-center text-sm text-[#888]">กำลังโหลด...</p>}
      {!loading && !finished && (
        <div className="px-2.5">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="w-full rounded-lg border border-[#1E88FF] bg-white py-2 text-sm text-[#1E88FF]"
          >
            โหลดเพิ่ม
          </button>
        </div>
      )}
      {!loading && finished && members.length === 0 && (
        <p className="py-10 text-center text-sm text-[#888]">ไม่มีสมาชิก</p>
      )}
    </div>
  )
}
