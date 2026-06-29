import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ASSETS } from '@/constants/assets'
import { PageNavBar } from '@/components/common/PageNavBar'
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
  color: string
  icon?: string
  badge?: 'deposit' | 'withdraw'
}[] = [
  { key: 'profile', label: 'โปรไฟล์', color: '#7b6cff', icon: ASSETS.profitIcon },
  { key: 'cards', label: 'ตั้งค่าถอน', color: '#ff8c2b', icon: ASSETS.cardsIcon },
  { key: 'lang', label: 'ภาษา', color: '#1abc9c', icon: ASSETS.langIcon },
  { key: 'service', label: 'บริการลูกค้า', color: '#ff5db8', icon: ASSETS.serviceIcon },
  { key: 'recharge', label: 'ฝากเงิน', color: '#ff983b', badge: 'deposit' },
  { key: 'withdraw', label: 'ถอนเงิน', color: '#4696ff', badge: 'withdraw' },
  { key: 'logout', label: 'ออกจากระบบ', color: '#4696ff', icon: ASSETS.logoutIcon },
]

function DepositBadge() {
  return (
    <span className="flex h-full w-full items-center justify-center rounded-lg bg-linear-to-b from-[#ffa64f] to-[#ff8c2b] text-sm font-bold text-white">
      $
    </span>
  )
}

function WithdrawBadge() {
  return (
    <span className="flex h-full w-full items-center justify-center rounded-lg bg-linear-to-b from-[#6bb5ff] to-[#3e8fff]">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M12 3v9" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M8 9l4 4 4-4"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 14h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z"
          fill="#fff"
          fillOpacity="0.35"
        />
      </svg>
    </span>
  )
}

export function MyPage({ onLoginClick, onNavigate, onServiceClick }: MyPageProps) {
  const { user, isLoggedIn, logout, refreshUser } = useAuth()
  const [isStaff, setIsStaff] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      setIsStaff(false)
      return
    }
    checkIsStaff()
      .then(setIsStaff)
      .catch(() => setIsStaff(false))
  }, [isLoggedIn])

  if (!isLoggedIn) {
    return (
      <div className="min-h-[100vh] bg-[#f5f5f5] pb-[60px]">
        <PageNavBar title="ของฉัน" />
        <div className="flex flex-col items-center px-6 py-16">
          <img src={ASSETS.logo} alt="" className="mb-4 h-20 w-20 rounded-full object-cover" />
          <p className="mb-4 text-sm text-[#666]">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-lg bg-[#148164] px-8 py-2.5 text-sm font-semibold text-white"
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
    onNavigate(key)
  }

  return (
    <div className="my-page flex min-h-[100vh] flex-col bg-[#f5f5f5] pb-[60px]">
      <PageNavBar title="ของฉัน" />

      <div
        className="wallet-card relative flex cursor-pointer items-center gap-3 overflow-hidden px-3 py-2.5 text-white"
        style={{
          backgroundImage: `url(${ASSETS.walletBg})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
        onClick={() => onNavigate('purses')}
      >
        <img
          src={user!.avatar}
          alt=""
          className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover shadow-[inset_0_0_0_2px_rgba(255,255,255,0.19)]"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate('profile')
          }}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{user!.nickname}</div>
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span>ยอดเงินคงเหลือ：</span>
            <span className="font-extrabold text-[#ffd86a]">{user!.balance.toLocaleString()}</span>
            <button
              type="button"
              onClick={() => void refreshUser()}
              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full opacity-90"
              aria-label="refresh"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-8.66 3.54l-1.42 1.42A7 7 0 1 0 19 12c0-2.03-.81-3.87-2.35-5.65z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-2.5 mt-2 flex items-center justify-evenly rounded-[10px] bg-white py-2.5">
        <button
          type="button"
          onClick={() => onNavigate('wallet-notes', { category: 'all' })}
          className="flex flex-col items-center justify-center"
        >
          <img src={ASSETS.walletIcon} alt="" className="h-[45px] w-[45px] object-contain md:h-[100px] md:w-[100px]" />
          <span className="mt-1 text-xs">รายละเอียดเงิน</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('game-bet')}
          className="flex flex-col items-center justify-center"
        >
          <img src={ASSETS.betHistoryIcon} alt="" className="h-[45px] w-[45px] object-contain md:h-[100px] md:w-[100px]" />
          <span className="mt-1 text-xs">ประวัติการเดิมพัน</span>
        </button>
      </div>

      {isStaff && (
        <div className="mx-2.5 mt-2">
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/admin'
            }}
            className="w-full rounded-lg bg-[#2d3748] py-2.5 text-sm font-semibold text-white"
          >
            ศูนย์ผู้ดูแล
          </button>
        </div>
      )}

      <div className="quick-grid mx-0 mt-0 grid grid-cols-3 border-l border-t border-[#eee] bg-white">
        {QUICK_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleQuickClick(item.key)}
            className="flex flex-col items-center justify-center gap-2 border-b border-r border-[#eee] bg-white px-1 py-5 transition-colors hover:bg-[#fafafa] active:scale-[0.98]"
            style={{ color: item.color }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
              {item.badge === 'deposit' && <DepositBadge />}
              {item.badge === 'withdraw' && <WithdrawBadge />}
              {item.icon && <img src={item.icon} alt="" className="h-full w-full object-contain" />}
            </span>
            <span className="text-sm leading-none">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
