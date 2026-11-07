import {
  Gamepad2,
  Gift,
  Headset,
  Home,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { TAB_ICONS } from '@/constants/assets'
import type { TabId } from '@/types'
import { cn } from '@/lib/utils'

interface BottomTabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

const TAB_ITEMS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'หน้าแรก', icon: Home },
  { id: 'game', label: 'เกม', icon: Gamepad2 },
  { id: 'bonus', label: 'โบนัส', icon: Gift },
  { id: 'service', label: 'บริการลูกค้า', icon: Headset },
  { id: 'my', label: 'ของฉัน', icon: User },
]

function tabIconSrc(id: TabId, active: boolean): string {
  switch (id) {
    case 'home':
      return active ? TAB_ICONS.home.active : TAB_ICONS.home.inactive
    case 'game':
      return TAB_ICONS.game
    case 'bonus':
      return active ? TAB_ICONS.bonus.active : TAB_ICONS.bonus.inactive
    case 'service':
      return TAB_ICONS.service
    case 'my':
      return active ? TAB_ICONS.my.active : TAB_ICONS.my.inactive
  }
}

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const [failed, setFailed] = useState(false)
  const item = TAB_ITEMS.find((t) => t.id === id)!
  const Icon = item.icon

  if (failed) {
    return (
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200',
          active
            ? 'bg-[#eef2ff] text-[#4e72f3] shadow-sm'
            : 'text-[#969799]',
        )}
      >
        <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
      </span>
    )
  }

  return (
    <img
      src={tabIconSrc(id, active)}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className={cn(
        'h-[22px] w-[22px] object-contain transition-opacity',
        active ? 'opacity-100' : 'opacity-55 group-hover:opacity-75',
      )}
    />
  )
}

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border-t border-[#ebedf0]/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur-lg"
      aria-label="เมนูหลัก"
    >
      <div className="flex h-[56px] items-stretch px-0.5">
        {TAB_ITEMS.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(id)}
              className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:opacity-80"
            >
              <TabIcon id={id} active={isActive} />
              <span
                className={cn(
                  'max-w-full truncate px-0.5 text-[10px] leading-none',
                  isActive ? 'font-semibold text-[#4e72f3]' : 'font-medium text-[#969799]',
                )}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({
  children,
  activeTab,
  onTabChange,
  showTabBar = true,
  className,
}: {
  children: React.ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  showTabBar?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative mx-auto min-h-screen w-full max-w-[700px] bg-[#f5f5f9]', className)}>
      {children}
      {showTabBar && <BottomTabBar active={activeTab} onChange={onTabChange} />}
    </div>
  )
}
