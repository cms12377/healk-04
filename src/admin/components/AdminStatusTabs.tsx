import { cn } from '@/lib/utils'
import type { AdminOrderStatus } from '@/types'

interface AdminStatusTabsProps {
  tabs: { value: AdminOrderStatus; label: string }[]
  value: AdminOrderStatus
  onChange: (value: AdminOrderStatus) => void
}

export function AdminStatusTabs({ tabs, value, onChange }: AdminStatusTabsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 border-b border-[#eee] bg-white px-3 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs',
            value === tab.value
              ? 'border-[#1E88FF] bg-[#1E88FF] text-white'
              : 'border-[#ddd] bg-white text-[#333]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
