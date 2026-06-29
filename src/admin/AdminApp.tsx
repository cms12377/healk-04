import { useCallback, useEffect, useState } from 'react'
import { LoginPage } from '@/components/auth/AuthPages'
import { adminNavigate, getStoredMemberName, parseAdminHash, type AdminRoute } from '@/admin/adminRouting'
import { AdminChongZhiPage } from '@/admin/pages/AdminChongZhiPage'
import { AdminMembersPage } from '@/admin/pages/AdminMembersPage'
import { AdminMenuPage } from '@/admin/pages/AdminMenuPage'
import { AdminOrderListPage } from '@/admin/pages/AdminOrderListPage'
import { useAuth } from '@/context/AuthContext'
import { checkIsStaff } from '@/lib/supabase'

export function AdminApp() {
  const { isLoggedIn, isReady, logout } = useAuth()
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
  }, [logout])

  if (!isReady) {
    return (
      <div className="flex min-h-[100vh] items-center justify-center bg-[#f5f5f5] text-sm text-[#888]">
        กำลังโหลด...
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <LoginPage
        onBack={() => {
          window.location.hash = '#/'
        }}
        onRegisterClick={() => {
          window.location.hash = '#/register'
        }}
        onSuccess={() => {
          adminNavigate({ page: 'menu' })
        }}
      />
    )
  }

  if (isStaff === null) {
    return (
      <div className="flex min-h-[100vh] items-center justify-center bg-[#f5f5f5] text-sm text-[#888]">
        กำลังตรวจสอบสิทธิ์...
      </div>
    )
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-[100vh] flex-col items-center justify-center gap-4 bg-[#f5f5f5] p-6 text-center">
        <p className="text-[#333]">บัญชีนี้ไม่มีสิทธิ์เข้าศูนย์ผู้ดูแล</p>
        <p className="text-sm text-[#888]">
          ตั้งค่าใน Supabase:{' '}
          <code className="rounded bg-white px-1">UPDATE users SET role = &apos;admin&apos; WHERE username = &apos;...&apos;</code>
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/'
          }}
          className="rounded-lg bg-[#427ffa] px-4 py-2 text-sm text-white"
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
    case 'menu':
    default:
      return <AdminMenuPage onLogout={() => void handleLogout()} />
  }
}
