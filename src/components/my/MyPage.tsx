import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Gift,
  Headphones,
  Languages,
  LogOut,
  Mail,
  Receipt,
  RefreshCw,
  User,
  Wallet,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PageNavBar } from '@/components/common/PageNavBar'
import { useAuth } from '@/context/AuthContext'
import { checkIsStaff } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { SubPage } from '@/types'

interface MyPageProps {
  onLoginClick: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
  onServiceClick?: () => void
  onPromotionsClick?: () => void
  onMessagesClick?: () => void
}

const QUICK_ITEMS: {
  key: SubPage | 'service' | 'logout'
  label: string
  icon: ReactNode
  iconBg: string
}[] = [
  {
    key: 'profile',
    label: 'โปรไฟล์',
    icon: <User className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#eef2ff] text-[#4e72f3]',
  },
  {
    key: 'cards',
    label: 'ตั้งค่าถอน',
    icon: <CreditCard className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#fff3e6] text-[#e65100]',
  },
  {
    key: 'lang',
    label: 'ภาษา',
    icon: <Languages className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#e8f5e9] text-[#2e7d32]',
  },
  {
    key: 'service',
    label: 'บริการลูกค้า',
    icon: <Headphones className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#fce4ec] text-[#c2185b]',
  },
  {
    key: 'recharge',
    label: 'ฝากเงิน',
    icon: <ArrowDownToLine className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#fff3e6] text-[#ff8c2b]',
  },
  {
    key: 'withdraw',
    label: 'ถอนเงิน',
    icon: <ArrowUpFromLine className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#eef2ff] text-[#4696ff]',
  },
  {
    key: 'logout',
    label: 'ออกจากระบบ',
    icon: <LogOut className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#ffebee] text-[#c62828]',
  },
]

export function MyPage({
  onLoginClick,
  onNavigate,
  onServiceClick,
  onPromotionsClick,
  onMessagesClick,
}: MyPageProps) {
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
      <div className="min-h-dvh bg-[#f5f5f9] pb-[72px]">
        <PageNavBar title="ของฉัน" variant="gradient" />
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
    onNavigate(key)
  }

  return (
    <div className="my-page flex min-h-dvh flex-col bg-[#f5f5f9] pb-[72px]">
      <PageNavBar title="ของฉัน" variant="gradient" />

      <button
        type="button"
        onClick={() => onNavigate('purses')}
        className="relative mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] px-4 py-5 text-left text-white shadow-lg shadow-[#3880e5]/20 ring-1 ring-white/10 transition active:scale-[0.99]"
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <UserAvatar
            src={user!.avatar}
            name={user!.nickname}
            size="lg"
            variant="header"
            className="h-14 w-14 ring-4 ring-white/25"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate('profile')
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold">{user!.nickname}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
              <span>ยอดเงินคงเหลือ</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xl font-bold tabular-nums text-[#ffd86a]">
                {user!.balance.toLocaleString()} ฿
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void refreshUser()
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                aria-label="รีเฟรชยอดเงิน"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </button>

      <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
        <div className="grid grid-cols-4 divide-x divide-gray-100">
          <ShortcutButton
            icon={<Wallet className="h-5 w-5" strokeWidth={2} />}
            iconBg="bg-[#eef2ff] text-[#4e72f3]"
            label="รายละเอียดเงิน"
            onClick={() => onNavigate('wallet-notes', { category: 'all' })}
          />
          <ShortcutButton
            icon={<Receipt className="h-5 w-5" strokeWidth={2} />}
            iconBg="bg-[#fff8e6] text-[#e65100]"
            label="ประวัติเดิมพัน"
            onClick={() => onNavigate('game-bet')}
          />
          {onPromotionsClick && (
            <ShortcutButton
              icon={<Gift className="h-5 w-5" strokeWidth={2} />}
              iconBg="bg-[#fff3e6] text-[#ff7043]"
              label="โปรโมชัน"
              onClick={onPromotionsClick}
            />
          )}
          {onMessagesClick && (
            <ShortcutButton
              icon={<Mail className="h-5 w-5" strokeWidth={2} />}
              iconBg="bg-[#eef2ff] text-[#4e72f3]"
              label="ข้อความ"
              onClick={onMessagesClick}
            />
          )}
        </div>
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

      <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
        <div className="grid grid-cols-3 divide-x divide-y divide-gray-100">
          {QUICK_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleQuickClick(item.key)}
              className="flex flex-col items-center justify-center gap-2 px-2 py-5 transition hover:bg-[#f8faff] active:bg-[#eef2ff] active:scale-[0.98]"
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  item.iconBg,
                )}
              >
                {item.icon}
              </span>
              <span className="text-center text-xs font-medium text-[#535867]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShortcutButton({
  icon,
  iconBg,
  label,
  onClick,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 px-2 py-4 transition hover:bg-[#f8faff] active:scale-[0.98]"
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </span>
      <span className="text-center text-[11px] font-medium leading-tight text-[#535867]">
        {label}
      </span>
    </button>
  )
}
