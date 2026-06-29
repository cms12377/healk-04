import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GameSidebarLayoutProps {
  tabs: { id: string; label: string; hasPick?: boolean }[]
  activeId: string
  onSelect: (id: string) => void
  children: ReactNode
}

/** th6688 CheBian — vertical sidebar + scrollable bet panel */
export function GameSidebarLayout({
  tabs,
  activeId,
  onSelect,
  children,
}: GameSidebarLayoutProps) {
  return (
    <div className="flex items-start border-t border-[#eee] bg-white">
      <nav className="sticky top-0 flex w-[80px] max-w-[80px] shrink-0 flex-col self-start border-r border-[#eee] bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={cn(
              'relative box-border flex min-h-[50px] w-full items-center break-all border-b border-[#eee] pl-5 pr-1 text-left text-[13px] leading-tight text-[#333]',
              activeId === tab.id && 'bg-[#5200e0] font-medium text-white',
            )}
          >
            <span
              className={cn(
                'absolute left-[10px] h-[7px] w-[7px] rounded-full',
                tab.hasPick ? 'bg-[#f8b551]' : 'bg-[#a5a9ac]',
              )}
            />
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="scroll-parent min-h-0 min-w-0 flex-1 bg-[#f5f5f9] pb-5">{children}</div>
    </div>
  )
}
