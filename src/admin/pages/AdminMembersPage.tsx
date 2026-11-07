import { useCallback, useEffect, useMemo, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminMemberEditSheet } from '@/admin/components/AdminMemberEditSheet'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import {
  ADMIN_MEMBER_STATUS_FILTERS,
  AdminFilterBar,
  AdminLoadMore,
  formatAdminListSummary,
} from '@/admin/components/AdminStatusTabs'
import { ScrollRowHint, ScrollRowTableSkeleton } from '@/components/common/ScrollRowTable'
import { AdminMembersTable } from '@/components/tables/MemberOrderTables'
import { registerUrlWithInvite } from '@/lib/inviteCode'
import { adminNavigateAgent } from '@/admin/adminRouting'
import {
  adminDeleteMember,
  adminListMembers,
  adminSetMemberPayPassword,
  adminSetMemberStatus,
  adminUpdateMember,
} from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { AdminMember } from '@/types'

interface AdminMembersPageProps {
  onBack: () => void
}

type MemberFilter = 'all' | 'active' | 'blocked'

export function AdminMembersPage({ onBack }: AdminMembersPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const inviteCode = user?.username?.toLowerCase()

  const [members, setMembers] = useState<AdminMember[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MemberFilter>('all')
  const [editMember, setEditMember] = useState<AdminMember | null>(null)
  const [saving, setSaving] = useState(false)

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    const res = await adminListMembers(pageNum)
    setTotal(res.total)
    setMembers((prev) => (append ? [...prev, ...res.data] : res.data))
    setFinished(res.data.length < res.limit)
    setPage(pageNum + 1)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    setPage(1)
    setFinished(false)
    try {
      await loadPage(1, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
      setMembers([])
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [loadPage])

  useEffect(() => {
    void reload()
  }, [reload])

  const loadMore = async () => {
    if (loadingMore || finished || loading) return
    setLoadingMore(true)
    setError('')
    try {
      await loadPage(page, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
      setFinished(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const filtered = useMemo(() => {
    let list = members
    if (filter === 'active') list = list.filter((m) => m.status === 1)
    if (filter === 'blocked') list = list.filter((m) => m.status === 0)
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.nickname.toLowerCase().includes(q),
    )
  }, [members, search, filter])

  const blockedCount = useMemo(() => members.filter((m) => m.status === 0).length, [members])

  const copyInviteLink = async () => {
    if (!inviteCode) return
    const link = `${window.location.origin}${window.location.pathname}${registerUrlWithInvite(inviteCode)}`
    try {
      await navigator.clipboard.writeText(link)
      alert('คัดลอกลิงก์สมัครสมาชิกแล้ว')
    } catch {
      alert(link)
    }
  }

  const handleSave = async (input: {
    nickname: string
    phone: string
    realName: string
    money?: number
  }) => {
    if (!editMember) return
    setSaving(true)
    try {
      const updated = await adminUpdateMember(editMember.id, input)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditMember(updated)
      alert('บันทึกแล้ว')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleBlock = async (member: AdminMember) => {
    const next = member.status === 0 ? 1 : 0
    const label = next === 0 ? 'บล็อก' : 'ปลดบล็อก'
    if (!window.confirm(`${label} @${member.username}?`)) return
    setSaving(true)
    try {
      const updated = await adminSetMemberStatus(member.id, next as 0 | 1)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      if (editMember?.id === updated.id) setEditMember(updated)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (member: AdminMember) => {
    if (!window.confirm(`ลบสมาชิก @${member.username} ถาวร?\nประวัติเดิมพันยังอยู่ในระบบ`)) return
    setSaving(true)
    try {
      await adminDeleteMember(member.id)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      setTotal((t) => Math.max(0, t - 1))
      setEditMember(null)
      alert('ลบแล้ว')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPayPassword = async (member: AdminMember, password: string) => {
    setSaving(true)
    try {
      const updated = await adminSetMemberPayPassword(member.id, password)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditMember(updated)
      alert('บันทึกรหัสผ่านถอนแล้ว')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกรหัสผ่านถอนไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleViewMemberRecords = (
    member: AdminMember,
    view: 'deposits' | 'withdraws' | 'bets' | 'payment',
  ) => {
    const name = member.nickname || member.username
    setEditMember(null)
    switch (view) {
      case 'deposits':
        adminNavigateAgent('hyChong', member.id, name)
        break
      case 'withdraws':
        adminNavigateAgent('hyTixian', member.id, name)
        break
      case 'bets':
        adminNavigateAgent('hyTou', member.id, name)
        break
      case 'payment':
        adminNavigateAgent('bindBank', member.id, name)
        break
    }
  }

  return (
    <AdminPageLayout title="สมาชิก" variant="gradient" showBack onBack={onBack}>
      <div className="mx-3 mt-2 space-y-2">
        <p className={cn('rounded-xl px-3 py-2.5 text-sm', AD.bannerSm, 'bg-[#eef2ff] text-[#4e72f3]')}>
          {isAdmin
            ? 'ผู้ดูแลระบบ: แก้ไข · บล็อก · ลบ · ปรับยอดเงินได้'
            : 'ตัวแทน: แก้ไขและบล็อกได้เฉพาะสมาชิกในสายงาน'}
        </p>
        {blockedCount > 0 && (
          <p className="rounded-xl bg-[#ffebee] px-3 py-2.5 text-sm font-medium text-[#c62828] ring-1 ring-[#ffcdd2]">
            มีสมาชิกถูกบล็อก {blockedCount} คน — แถวสีแดงอ่อนในตาราง
          </p>
        )}
        {!isAdmin && inviteCode && (
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-sm ring-1 ring-black/5"
          >
            <span className="font-semibold text-[#4e72f3]">ลิงก์สมัครสมาชิก</span>
            <span className="mt-1 block truncate font-mono text-xs text-[#646566]">
              #/register?invite={inviteCode}
            </span>
          </button>
        )}
      </div>

      <AdminFilterBar
        label="กรองตามสถานะบัญชี"
        options={ADMIN_MEMBER_STATUS_FILTERS}
        value={filter}
        onChange={setFilter}
        summary={formatAdminListSummary(
          search || filter !== 'all' ? filtered.length : members.length,
          search || filter !== 'all' ? filtered.length : total,
          search || filter !== 'all' ? 'พบ' : 'แสดง',
        )}
      />

      <div className="bg-white px-3 py-3 ring-1 ring-black/5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อผู้ใช้..."
          className={cn(AD.input, 'border-[#ebedf0] bg-[#fafbfc] focus:ring-1 focus:ring-[#4e72f3]/20')}
        />
      </div>

      <ScrollRowHint className={cn('mx-3 mt-2 text-sm', AD.hint)} />

      {error && (
        <p className="mx-3 mt-2 rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
          {error}
        </p>
      )}

      <div className="mt-2.5">
        {loading && members.length === 0 && (
          <ScrollRowTableSkeleton className="mx-0 rounded-none shadow-none ring-0" />
        )}
        {!loading && filtered.length > 0 && (
          <AdminMembersTable
            rows={filtered}
            isAdmin={isAdmin}
            onEdit={setEditMember}
            onToggleBlock={(m) => void handleToggleBlock(m)}
            onDelete={(m) => void handleDelete(m)}
            className="mx-0 rounded-none shadow-none ring-0"
          />
        )}
        {!loading && !error && members.length === 0 && (
          <p className="px-4 py-10 text-center text-sm leading-relaxed text-[#888]">
            {isAdmin
              ? 'ยังไม่มีสมาชิก — ให้สมัครจากแอปสมาชิก'
              : 'ยังไม่มีสมาชิกในสายงาน — ใช้ลิงก์เชิญด้านบน'}
          </p>
        )}
      </div>

      {!search && filter === 'all' && (
        <AdminLoadMore
          loading={loadingMore}
          finished={finished}
          empty={!loading && members.length === 0}
          onLoadMore={() => void loadMore()}
        />
      )}
      {(search || filter !== 'all') && filtered.length === 0 && !loading && members.length > 0 && (
        <p className="py-12 text-center text-base text-[#888]">
          {search ? 'ไม่พบสมาชิก' : 'ไม่มีสมาชิกในหมวดนี้'}
        </p>
      )}

      <AdminMemberEditSheet
        member={editMember}
        isAdmin={isAdmin}
        saving={saving}
        onClose={() => setEditMember(null)}
        onSave={(input) => void handleSave(input)}
        onResetPayPassword={(m, pwd) => void handleResetPayPassword(m, pwd)}
        onToggleBlock={(m) => void handleToggleBlock(m)}
        onDelete={(m) => void handleDelete(m)}
        onViewMemberRecords={handleViewMemberRecords}
      />
    </AdminPageLayout>
  )
}
