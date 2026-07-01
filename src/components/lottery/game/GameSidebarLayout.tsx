import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GameSidebarLayoutProps {
  tabs: { id: string; label: string; hasPick?: boolean }[]
  activeId: string
  onSelect: (id: string) => void
  children: ReactNode
}

/** Left sidebar width — room for Thai tab labels (สองด้าน, ผลรวม, อันดับ 1–10) */
const SIDEBAR_WIDTH = 'w-[104px] max-w-[104px]'

export function GameSidebarLayout({
  tabs,
  activeId,
  onSelect,
  children,
}: GameSidebarLayoutProps) {
  return (
    <div className="mx-2 mb-2 flex items-start overflow-visible rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      <nav
        className={cn(
          'sticky top-0 flex max-h-[min(420px,65dvh)] shrink-0 flex-col self-start overflow-y-auto overscroll-contain border-r border-gray-100 bg-[#fafbfc] [-webkit-overflow-scrolling:touch]',
          SIDEBAR_WIDTH,
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                'relative flex min-h-[48px] w-full items-center border-b border-gray-100 py-1.5 pl-3 pr-2 text-left text-[14px] leading-snug transition-colors',
                isActive
                  ? 'bg-gradient-to-r from-[#4e72f3] to-[#3880e5] font-semibold text-white shadow-inner'
                  : 'text-[#535867] hover:bg-[#f0f4ff]',
              )}
            >
              <span
                className={cn(
                  'absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full',
                  tab.hasPick
                    ? isActive
                      ? 'bg-[#ffd54f] ring-2 ring-white/40'
                      : 'bg-[#ff9800]'
                    : isActive
                      ? 'bg-white/50'
                      : 'bg-[#c8c9cc]',
                )}
              />
              <span className="pl-2.5">{tab.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="scroll-parent min-h-0 min-w-0 flex-1 bg-[#f5f7fa] pb-1">{children}</div>
    </div>
  )
}
