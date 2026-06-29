import { cn } from '@/lib/utils'
import type { AdminOrderStatus } from '@/types'

interface AdminStatusTabsProps {
  tabs: { value: AdminOrderStatus; label: string }[]
  value: AdminOrderStatus
  onChange: (value: AdminOrderStatus) => void
}

export function AdminStatusTabs({ tabs, value, onChange }: AdminStatusTabsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5 bg-white px-2.5 py-2.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-full border px-3 py-1 text-[12px] transition-colors',
            value === tab.value
              ? 'border-[#148164] bg-[#148164] text-white'
              : 'border-[#ddd] bg-white text-[#333]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function AdminListSummary({
  loaded,
  total,
  label,
}: {
  loaded: number
  total: number
  label: string
}) {
  if (total === 0) return null
  return (
    <p className="bg-white px-3 py-1.5 text-center text-xs text-[#888]">
      {label} {loaded.toLocaleString()} / {total.toLocaleString()} รายการ
    </p>
  )
}

export function AdminLoadMore({
  loading,
  finished,
  empty,
  onLoadMore,
}: {
  loading: boolean
  finished: boolean
  empty: boolean
  onLoadMore: () => void
}) {
  if (empty && !loading) {
    return <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อมูล</p>
  }
  if (loading) {
    return <p className="py-4 text-center text-sm text-[#888]">กำลังโหลด...</p>
  }
  if (!finished) {
    return (
      <button
        type="button"
        onClick={onLoadMore}
        className="mx-2.5 w-[calc(100%-20px)] rounded-lg border border-[#148164] bg-white py-2 text-sm text-[#148164]"
      >
        โหลดเพิ่ม
      </button>
    )
  }
  if (!empty) {
    return <p className="py-2 text-center text-xs text-[#aaa]">ไม่มีข้อมูลเพิ่มเติม</p>
  }
  return null
}
