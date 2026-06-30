import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GameSidebarLayoutProps {
  tabs: { id: string; label: string; hasPick?: boolean }[]
  activeId: string
  onSelect: (id: string) => void
  children: ReactNode
}

export function GameSidebarLayout({
  tabs,
  activeId,
  onSelect,
  children,
}: GameSidebarLayoutProps) {
  return (
    <div className="mx-3 mb-3 flex items-start overflow-visible rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      <nav className="sticky top-0 flex w-[84px] max-w-[84px] shrink-0 flex-col self-start border-r border-gray-100 bg-[#fafbfc]">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                'relative flex min-h-[52px] w-full items-center break-all border-b border-gray-100 py-2 pl-5 pr-1.5 text-left text-[12px] leading-tight transition-colors',
                isActive
                  ? 'bg-gradient-to-r from-[#4e72f3] to-[#3880e5] font-semibold text-white shadow-inner'
                  : 'text-[#535867] hover:bg-[#f0f4ff]',
              )}
            >
              <span
                className={cn(
                  'absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full',
                  tab.hasPick
                    ? isActive
                      ? 'bg-[#ffd54f] ring-2 ring-white/40'
                      : 'bg-[#ff9800]'
                    : isActive
                      ? 'bg-white/50'
                      : 'bg-[#c8c9cc]',
                )}
              />
              {tab.label}
            </button>
          )
        })}
      </nav>
      <div className="scroll-parent min-h-0 min-w-0 flex-1 bg-[#f5f7fa] pb-3">{children}</div>
    </div>
  )
}
