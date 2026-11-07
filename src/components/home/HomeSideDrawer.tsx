import { Clock, Headphones, LogOut, Trophy } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useAuth } from '@/context/AuthContext'
import type { AppView, SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface HomeSideDrawerProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
  onNavigateView?: (view: AppView) => void
  gameContext?: { gameId: number; code: string; issue?: string }
  onServiceClick: () => void
}

export function HomeSideDrawer({
  open,
  onClose,
  onNavigate,
  onNavigateView,
  gameContext,
  onServiceClick,
}: HomeSideDrawerProps) {
  const { user, isLoggedIn, logout } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
      return
    }
    setVisible(false)
  }, [open])

  if (!open) return null

  const handleNav = (page: SubPage, params?: Record<string, string>) => {
    onClose()
    onNavigate(page, params)
  }

  const handleGameBetNav = (mode: 'orders' | 'settled') => {
    if (!isLoggedIn || !gameContext || !onNavigateView) {
      handleNav('game-bet', { status: mode === 'orders' ? '0' : '1' })
      return
    }
    onClose()
    onNavigateView({
      type: mode === 'orders' ? 'lottery-orders' : 'lottery-settled',
      gameId: gameContext.gameId,
      code: gameContext.code,
      issue: gameContext.issue,
      from: 'game',
    })
  }

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end">
      <button
        type="button"
        aria-label="ปิดเมนู"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />

      <aside
        className={cn(
          'relative flex h-full w-[50%] min-w-[240px] max-w-[320px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] px-4 py-8 text-white">
          <UserAvatar
            src={user?.avatar}
            name={user?.nickname}
            size="lg"
            variant="header"
            className="h-14 w-14 ring-4 ring-white/25"
          />
          <p className="text-sm font-medium text-white/85">ยอดเงินคงเหลือ</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {isLoggedIn ? `${(user?.balance ?? 0).toLocaleString()} ฿` : '—'}
          </p>
          {isLoggedIn && user?.nickname && (
            <p className="max-w-full truncate text-xs text-white/70">{user.nickname}</p>
          )}
        </div>

        <div className="flex flex-col gap-1 border-b border-gray-100 py-3">
          <DrawerRow
            icon={<Trophy className="h-4 w-4" strokeWidth={2.2} />}
            iconBg="bg-[#fff3e6] text-[#e65100]"
            title="กำไรวันนี้"
            subtitle={
              isLoggedIn
                ? `${(user?.dayWin ?? 0).toLocaleString()} ฿`
                : 'เข้าสู่ระบบก่อน'
            }
            disabled={!isLoggedIn}
            onClick={() => handleGameBetNav('settled')}
          />
          <DrawerRow
            icon={<Clock className="h-4 w-4" strokeWidth={2.2} />}
            iconBg="bg-[#eef2ff] text-[#4e72f3]"
            title="ยอดรอผล"
            subtitle={
              isLoggedIn
                ? `${(user?.unsettled ?? 0).toLocaleString()} ฿`
                : 'เข้าสู่ระบบก่อน'
            }
            disabled={!isLoggedIn}
            onClick={() => handleGameBetNav('orders')}
          />
        </div>

        <div className="flex flex-col gap-1 py-3">
          <DrawerRow
            icon={<Headphones className="h-4 w-4" strokeWidth={2.2} />}
            iconBg="bg-[#e8f5e9] text-[#2e7d32]"
            title="บริการลูกค้า"
            onClick={() => {
              onClose()
              onServiceClick()
            }}
          />
          {isLoggedIn && (
            <DrawerRow
              icon={<LogOut className="h-4 w-4" strokeWidth={2.2} />}
              iconBg="bg-[#ffebee] text-[#c62828]"
              title="ออกจากระบบ"
              onClick={() => {
                onClose()
                void logout()
              }}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

function DrawerRow({
  icon,
  iconBg,
  title,
  subtitle,
  disabled,
  onClick,
}: {
  icon: ReactNode
  iconBg: string
  title: string
  subtitle?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-[#f8faff] active:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          iconBg,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-[#2c3345]">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block text-xs text-[#969799]">{subtitle}</span>
        )}
      </span>
    </button>
  )
}
