import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminOrderStatus } from '@/types'

export type AdminFilterTone = 'neutral' | 'pending' | 'success' | 'danger' | 'info' | 'warning'

export interface AdminFilterOption<T extends string = string> {
  value: T
  label: string
  tone?: AdminFilterTone
}

const TONE_CLASS: Record<
  AdminFilterTone,
  { active: string; idle: string }
> = {
  neutral: {
    active: 'border-[#4e72f3] bg-[#4e72f3] text-white shadow-sm',
    idle: 'border-[#ebedf0] bg-[#f5f5f9] text-[#646566] hover:bg-[#eef2ff]',
  },
  pending: {
    active: 'border-[#e65100] bg-[#e65100] text-white shadow-sm',
    idle: 'border-[#ffe0b2] bg-[#fff8e6] text-[#e65100] hover:bg-[#fff3e0]',
  },
  success: {
    active: 'border-[#2e7d32] bg-[#2e7d32] text-white shadow-sm',
    idle: 'border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#f1f8e9]',
  },
  danger: {
    active: 'border-[#c62828] bg-[#c62828] text-white shadow-sm',
    idle: 'border-[#ffcdd2] bg-[#ffebee] text-[#c62828] hover:bg-[#ffcdd2]/40',
  },
  info: {
    active: 'border-[#4e72f3] bg-[#4e72f3] text-white shadow-sm',
    idle: 'border-[#c5cae9] bg-[#eef2ff] text-[#4e72f3] hover:bg-[#e8eaf6]',
  },
  warning: {
    active: 'border-[#f57f17] bg-[#f57f17] text-white shadow-sm',
    idle: 'border-[#ffe082] bg-[#fff8e1] text-[#f57f17] hover:bg-[#fffde7]',
  },
}

export function AdminFilterBar<T extends string>({
  label = 'กรองตามสถานะ',
  options,
  value,
  onChange,
  summary,
  className,
}: {
  label?: string
  options: AdminFilterOption<T>[]
  value: T
  onChange: (value: T) => void
  summary?: string
  className?: string
}) {
  return (
    <div className={cn('mx-3 mt-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5', className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#646566]">
          <Filter className="h-4 w-4 shrink-0 text-[#969799]" strokeWidth={2.2} />
          {label}
        </div>
        {summary && <span className="text-xs tabular-nums text-[#969799]">{summary}</span>}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {options.map((opt) => {
          const tone = opt.tone ?? 'neutral'
          const styles = TONE_CLASS[tone]
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active ? styles.active : styles.idle,
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AdminStatusTabsProps {
  tabs: AdminFilterOption<AdminOrderStatus>[]
  value: AdminOrderStatus
  onChange: (value: AdminOrderStatus) => void
  label?: string
  summary?: string
}

/** @deprecated use AdminFilterBar — kept for order list pages */
export function AdminStatusTabs({ tabs, value, onChange, label, summary }: AdminStatusTabsProps) {
  return (
    <AdminFilterBar
      label={label ?? 'กรองตามสถานะ'}
      options={tabs}
      value={value}
      onChange={onChange}
      summary={summary}
    />
  )
}

export const ADMIN_MEMBER_STATUS_FILTERS: AdminFilterOption<'all' | 'active' | 'blocked'>[] = [
  { value: 'all', label: 'ทั้งหมด', tone: 'neutral' },
  { value: 'active', label: 'ใช้งานปกติ', tone: 'success' },
  { value: 'blocked', label: 'ถูกบล็อก', tone: 'danger' },
]

export const ADMIN_IDENTITY_FILTERS: AdminFilterOption<'pending'>[] = [
  { value: 'pending', label: 'รอตรวจ', tone: 'pending' },
]

export const ADMIN_BONUS_TAB_FILTERS: AdminFilterOption<'promotions' | 'vip' | 'messages'>[] = [
  { value: 'promotions', label: 'โปรโมชั่น', tone: 'info' },
  { value: 'vip', label: 'VIP', tone: 'warning' },
  { value: 'messages', label: 'ข้อความ', tone: 'neutral' },
]

export const ADMIN_DEPOSIT_ACCOUNT_FILTERS: AdminFilterOption<'bank' | 'crypto'>[] = [
  { value: 'bank', label: 'ฝากมาตรฐาน', tone: 'info' },
  { value: 'crypto', label: 'ฝากคริปโต', tone: 'warning' },
]

export function formatAdminListSummary(
  loaded: number,
  total: number,
  label: string,
): string | undefined {
  if (total === 0) return undefined
  return `${label} ${loaded.toLocaleString()} / ${total.toLocaleString()} รายการ`
}

/** @deprecated use formatAdminListSummary inside AdminFilterBar summary */
export function AdminListSummary({
  loaded,
  total,
  label,
}: {
  loaded: number
  total: number
  label: string
}) {
  const text = formatAdminListSummary(loaded, total, label)
  if (!text) return null
  return (
    <p className="bg-white px-4 py-2.5 text-center text-base text-[#888]">{text}</p>
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
