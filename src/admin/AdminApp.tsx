import { useCallback, useEffect, useState } from 'react'
import { adminNavigate, getStoredMemberName, goAdminMenu, goMemberApp, parseAdminHash, type AdminRoute } from '@/admin/adminRouting'
import { AdminBonusPage } from '@/admin/pages/AdminBonusPage'
import { AdminChongZhiPage } from '@/admin/pages/AdminChongZhiPage'
import { AdminDepositAccountsPage } from '@/admin/pages/AdminDepositAccountsPage'
import { AdminGamesPage } from '@/admin/pages/AdminGamesPage'
import { AdminIdentityPage } from '@/admin/pages/AdminIdentityPage'
import { AdminMemberPaymentPage } from '@/admin/pages/AdminMemberPaymentPage'
import { AdminMembersPage } from '@/admin/pages/AdminMembersPage'
import { AdminMenuPage } from '@/admin/pages/AdminMenuPage'
import { AdminOrderListPage } from '@/admin/pages/AdminOrderListPage'
import { AdminServiceChatPage } from '@/admin/pages/AdminServiceChatPage'
import { AdminSettingsPage } from '@/admin/pages/AdminSettingsPage'
import { useAuth } from '@/context/AuthContext'
import { checkIsStaff } from '@/lib/supabase'

export function AdminApp() {
  const { isLoggedIn, logout, user } = useAuth()
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

  const goMenu = useCallback(() => goAdminMenu(), [])

  const handleLogout = useCallback(async () => {
    await logout()
    setIsStaff(null)
    goMemberApp()
  }, [logout])

  const isAdmin = user?.role === 'admin'
  const currentPage = (route ?? { page: 'menu' as const }).page

  useEffect(() => {
    if (!isStaff || isAdmin) return
    const adminOnly = ['games', 'bonus', 'settings', 'deposit-accounts', 'service-chat']
    if (adminOnly.includes(currentPage)) {
      goAdminMenu()
    }
  }, [isStaff, isAdmin, currentPage])

  if (!isLoggedIn) {
    return null
  }

  if (isStaff === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f5f5f9] text-[16px]">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#4e72f3] border-t-transparent" />
        <p className="text-lg text-[#969799]">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    )
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#f5f5f9] p-8 text-center text-[16px]">
        <p className="text-xl font-semibold text-[#2c3345]">บัญชีนี้ไม่มีสิทธิ์เข้าศูนย์ผู้ดูแล</p>
        <p className="text-lg text-[#969799]">
          ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ admin
        </p>
        <button
          type="button"
          onClick={goMemberApp}
          className="rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] px-8 py-3.5 text-lg font-semibold text-white shadow-sm"
        >
          กลับแอปสมาชิก
        </button>
      </div>
    )
  }

  const current = route ?? { page: 'menu' as const }

  if (!isAdmin && ['games', 'bonus', 'settings', 'deposit-accounts', 'service-chat'].includes(current.page)) {
    return null
  }

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
    case 'member-payment':
      return (
        <AdminMemberPaymentPage
          userId={current.memberId!}
          username={memberName}
          onBack={() => adminNavigate({ page: 'members' })}
        />
      )
    case 'identity':
      return <AdminIdentityPage onBack={goMenu} />
    case 'chongzhi':
      return <AdminChongZhiPage onBack={goMenu} />
    case 'deposit-accounts':
      return <AdminDepositAccountsPage onBack={goMenu} />
    case 'settings':
      return <AdminSettingsPage onBack={goMenu} />
    case 'games':
      return <AdminGamesPage onBack={goMenu} />
    case 'service-chat':
      return <AdminServiceChatPage onBack={goMenu} />
    case 'bonus':
      return <AdminBonusPage onBack={goMenu} />
    case 'menu':
    default:
      return <AdminMenuPage onLogout={() => void handleLogout()} />
  }
}
