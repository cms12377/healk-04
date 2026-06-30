import { useCallback, useEffect, useState } from 'react'
import { adminNavigate, getStoredMemberName, goMemberApp, parseAdminHash, type AdminRoute } from '@/admin/adminRouting'
import { AdminChongZhiPage } from '@/admin/pages/AdminChongZhiPage'
import { AdminGamesPage } from '@/admin/pages/AdminGamesPage'
import { AdminMembersPage } from '@/admin/pages/AdminMembersPage'
import { AdminMenuPage } from '@/admin/pages/AdminMenuPage'
import { AdminOrderListPage } from '@/admin/pages/AdminOrderListPage'
import { AdminSettingsPage } from '@/admin/pages/AdminSettingsPage'
import { useAuth } from '@/context/AuthContext'
import { checkIsStaff } from '@/lib/supabase'

export function AdminApp() {
  const { isLoggedIn, logout } = useAuth()
  const [route, setRoute] = useState<AdminRoute | null>(() => parseAdminHash())
  const [isStaff, setIsStaff] = useState<boolean | null>(null)

  useEffect(() => {
    const onHash = () => setRoute(parseAdminHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      setIsStaff(null)
      return
    }
    checkIsStaff()
      .then(setIsStaff)
      .catch(() => setIsStaff(false))
  }, [isLoggedIn])

  const goMenu = useCallback(() => adminNavigate({ page: 'menu' }), [])

  const handleLogout = useCallback(async () => {
    await logout()
    setIsStaff(null)
    goMemberApp()
  }, [logout])

  if (!isLoggedIn) {
    return null
  }

  if (isStaff === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f5f5f9]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4e72f3] border-t-transparent" />
        <p className="text-sm text-[#969799]">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    )
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f5f5f9] p-6 text-center">
        <p className="font-medium text-[#2c3345]">บัญชีนี้ไม่มีสิทธิ์เข้าศูนย์ผู้ดูแล</p>
        <p className="text-sm text-[#969799]">
          ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ admin
        </p>
        <button
          type="button"
          onClick={goMemberApp}
          className="rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] px-6 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          กลับแอปสมาชิก
        </button>
      </div>
    )
  }

  const current = route ?? { page: 'menu' as const }
  const memberName =
    current.memberId !== undefined
      ? getStoredMemberName(current.memberId)
      : undefined

  switch (current.page) {
    case 'recharge':
      return (
        <AdminOrderListPage kind="deposit" title="รายการฝากเงิน" onBack={goMenu} />
      )
    case 'withdraw':
      return (
        <AdminOrderListPage kind="withdraw" title="รายการถอนเงิน" onBack={goMenu} />
      )
    case 'bets':
      return (
        <AdminOrderListPage kind="bet" title="ประวัติเดิมพัน" onBack={goMenu} />
      )
    case 'members':
      return <AdminMembersPage onBack={goMenu} />
    case 'member-recharge':
      return (
        <AdminOrderListPage
          kind="deposit"
          title="ฝากเงินสมาชิก"
          userId={current.memberId}
          username={memberName}
          onBack={() => adminNavigate({ page: 'members' })}
        />
      )
    case 'member-withdraw':
      return (
        <AdminOrderListPage
          kind="withdraw"
          title="ถอนเงินสมาชิก"
          userId={current.memberId}
          username={memberName}
          onBack={() => adminNavigate({ page: 'members' })}
        />
      )
    case 'member-bets':
      return (
        <AdminOrderListPage
          kind="bet"
          title="เดิมพันสมาชิก"
          userId={current.memberId}
          username={memberName}
          onBack={() => adminNavigate({ page: 'members' })}
        />
      )
    case 'chongzhi':
      return <AdminChongZhiPage onBack={goMenu} />
    case 'settings':
      return <AdminSettingsPage onBack={goMenu} />
    case 'games':
      return <AdminGamesPage onBack={goMenu} />
    case 'menu':
    default:
      return <AdminMenuPage onLogout={() => void handleLogout()} />
  }
}
