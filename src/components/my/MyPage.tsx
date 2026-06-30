import { LogOut, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PageNavBar } from '@/components/common/PageNavBar'
import { ASSETS } from '@/constants/assets'
import { useAuth } from '@/context/AuthContext'
import { checkIsStaff } from '@/lib/supabase'
import type { SubPage } from '@/types'

interface MyPageProps {
  onLoginClick: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
  onServiceClick?: () => void
}

const QUICK_ITEMS: {
  key: SubPage | 'service' | 'logout'
  label: string
  iconSrc?: string
  badge?: 'deposit' | 'withdraw'
}[] = [
  { key: 'profile', label: 'ศูนย์ส่วนตัว', iconSrc: ASSETS.profitIcon },
  { key: 'cards', label: 'ตั้งค่าถอน', iconSrc: ASSETS.cardsIcon },
  { key: 'lang', label: 'ภาษา', iconSrc: ASSETS.langIcon },
  { key: 'service', label: 'บริการลูกค้า', iconSrc: ASSETS.serviceIcon },
  { key: 'recharge', label: 'ฝากเงิน', badge: 'deposit' },
  { key: 'withdraw', label: 'ถอนเงิน', badge: 'withdraw' },
  { key: 'logout', label: 'ออกจากระบบ' },
]

export function MyPage({ onLoginClick, onNavigate, onServiceClick }: MyPageProps) {
  const { user, isLoggedIn, logout, refreshUser } = useAuth()
  const [isStaff, setIsStaff] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      setIsStaff(false)
      return
    }
    checkIsStaff()
      .then(setIsStaff)
      .catch(() => setIsStaff(false))
  }, [isLoggedIn])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!isLoggedIn) {
    return (
      <div className="min-h-dvh bg-[#f5f5f9] pb-[72px]">
        <PageNavBar title="ของฉัน" variant="blue" />
        <div className="mx-3 mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-12 shadow-md ring-1 ring-black/5">
          <UserAvatar size="lg" className="h-16 w-16" />
          <p className="mt-4 text-sm font-medium text-[#646566]">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          <button
            type="button"
            onClick={onLoginClick}
            className="mt-5 rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    )
  }

  const handleQuickClick = (key: SubPage | 'service' | 'logout') => {
    if (key === 'logout') {
      void logout()
      return
    }
    if (key === 'service') {
      onServiceClick?.()
      return
    }
    if (key === 'withdraw') {
      if (!user?.hasPayPassword) {
        setToast('กรุณาตั้งรหัสผ่านถอนก่อน')
        onNavigate('edit-pay-password')
        return
      }
    }
    onNavigate(key)
  }

  return (
    <div className="my-page flex min-h-dvh flex-col bg-[#f5f5f9] pb-[72px]">
      <PageNavBar title="ของฉัน" variant="blue" />

      <div className="relative mx-3 mt-3 overflow-hidden rounded-[10px] bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] px-4 py-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <UserAvatar
            src={user!.avatar}
            name={user!.nickname}
            size="lg"
            variant="header"
            className="h-[58px] w-[58px] cursor-pointer ring-2 ring-white/30"
            onClick={() => onNavigate('profile')}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold">{user!.nickname}</div>
            <div className="mt-1 text-sm text-white/90">
              ยอดเงินคงเหลือ：
              <span className="ml-1 text-lg font-bold tabular-nums text-[#ffd86a]">
                {user!.balance.toLocaleString()} ฿
              </span>
            </div>
            <button
              type="button"
              onClick={() => void refreshUser()}
              className="mt-1 inline-flex items-center gap-1 text-xs text-white/80"
              aria-label="รีเฟรชยอดเงิน"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      <div className="mx-3 mt-3 flex items-center justify-evenly rounded-[10px] bg-white py-2.5">
        <button
          type="button"
          onClick={() => onNavigate('wallet-notes', { category: 'all' })}
          className="flex flex-col items-center gap-1 active:opacity-80"
        >
          <img src={ASSETS.walletIcon} alt="" className="h-[45px] w-[45px] object-contain" />
          <span className="text-xs text-[#535867]">รายละเอียดเงิน</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('game-bet')}
          className="flex flex-col items-center gap-1 active:opacity-80"
        >
          <img src={ASSETS.betHistoryIcon} alt="" className="h-[45px] w-[45px] object-contain" />
          <span className="text-xs text-[#535867]">ประวัติเดิมพัน</span>
        </button>
      </div>

      {isStaff && (
        <div className="mx-3 mt-3">
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/admin'
            }}
            className="w-full rounded-xl bg-[#2d3748] py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
          >
            ศูนย์ผู้ดูแล
          </button>
        </div>
      )}

      <div className="mx-3 mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] bg-[#eee]">
        {QUICK_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleQuickClick(item.key)}
            className="flex flex-col items-center justify-center gap-2 bg-white px-2 py-5 transition hover:bg-[#f8faff] active:bg-[#eef2ff]"
          >
            <span className="flex h-9 w-9 items-center justify-center">
              {item.badge === 'deposit' ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff983b] text-sm font-bold text-white">
                  $
                </span>
              ) : item.badge === 'withdraw' ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4696ff] text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                    <path
                      d="M12 3v9M8 9l4 4 4-4M4 14h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : item.iconSrc ? (
                <img src={item.iconSrc} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff] text-[#4696ff]">
                  <LogOut className="h-4 w-4" strokeWidth={2.2} />
                </span>
              )}
            </span>
            <span className="text-center text-xs font-medium text-[#535867]">{item.label}</span>
          </button>
        ))}
      </div>

      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-[2000] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/75 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
