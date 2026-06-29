import {
  Gamepad2,
  Gift,
  Headset,
  Home,
  User,
  type LucideIcon,
} from 'lucide-react'
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
  { id: 'service', label: 'บริการ', icon: Headset },
  { id: 'my', label: 'ของฉัน', icon: User },
]

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border-t border-[#ebedf0]/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur-lg"
      aria-label="เมนูหลัก"
    >
      <div className="flex h-[56px] items-stretch px-0.5">
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(id)}
              className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:opacity-80"
            >
              {isActive && (
                <span
                  className="absolute top-0 h-[3px] w-10 rounded-b-full bg-[#4e72f3]"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200',
                  isActive
                    ? 'bg-[#eef2ff] text-[#4e72f3] shadow-sm'
                    : 'text-[#969799] group-hover:text-[#646566]',
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
              </span>
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
