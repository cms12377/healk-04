import { TAB_ICONS } from '@/constants/assets'
import type { TabId } from '@/types'
import { cn } from '@/lib/utils'

interface BottomTabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

function getTabIcon(tab: TabId, isActive: boolean): string {
  switch (tab) {
    case 'home':
      return isActive ? TAB_ICONS.home.active : TAB_ICONS.home.inactive
    case 'game':
      return TAB_ICONS.game
    case 'bonus':
      return isActive ? TAB_ICONS.bonus.active : TAB_ICONS.bonus.inactive
    case 'service':
      return TAB_ICONS.service
    case 'my':
      return isActive ? TAB_ICONS.my.active : TAB_ICONS.my.inactive
    default:
      return TAB_ICONS.home.inactive
  }
}

const TAB_ORDER: TabId[] = ['home', 'game', 'bonus', 'service', 'my']

const TAB_LABELS: Record<TabId, string> = {
  home: 'หน้าแรก',
  game: 'เกม',
  bonus: 'โบนัส',
  service: 'บริการลูกค้า',
  my: 'ของฉัน',
}

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border-t border-[#ebedf0] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-[50px] items-stretch">
        {TAB_ORDER.map((tab) => {
          const isActive = active === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
              style={{ color: isActive ? '#4e72f3' : '#323233' }}
            >
              <img
                src={getTabIcon(tab, isActive)}
                alt=""
                className="h-[20px] w-[20px] object-contain"
              />
              <span className="text-[10px] leading-none">{TAB_LABELS[tab]}</span>
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
