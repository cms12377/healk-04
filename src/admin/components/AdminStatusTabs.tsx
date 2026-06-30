import { cn } from '@/lib/utils'
import type { AdminOrderStatus } from '@/types'

interface AdminStatusTabsProps {
  tabs: { value: AdminOrderStatus; label: string }[]
  value: AdminOrderStatus
  onChange: (value: AdminOrderStatus) => void
}

export function AdminStatusTabs({ tabs, value, onChange }: AdminStatusTabsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 bg-white px-3 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-full border px-4 py-2 text-base font-medium transition-colors',
            value === tab.value
              ? 'border-[#4e72f3] bg-[#4e72f3] text-white shadow-sm'
              : 'border-[#ebedf0] bg-white text-[#646566] hover:bg-[#f8faff]',
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
    <p className="bg-white px-4 py-2.5 text-center text-base text-[#888]">
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
    return <p className="py-12 text-center text-base text-[#888]">ไม่มีข้อมูล</p>
  }
  if (loading) {
    return <p className="py-6 text-center text-base text-[#888]">กำลังโหลด...</p>
  }
  if (!finished) {
    return (
      <button
        type="button"
        onClick={onLoadMore}
        className="mx-3 mb-4 w-[calc(100%-24px)] rounded-xl border-2 border-[#148164] bg-white py-3 text-base font-medium text-[#148164]"
      >
        โหลดเพิ่ม
      </button>
    )
  }
  if (!empty) {
    return <p className="py-3 text-center text-sm text-[#aaa]">ไม่มีข้อมูลเพิ่มเติม</p>
  }
  return null
}
