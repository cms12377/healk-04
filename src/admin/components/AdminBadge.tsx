import type { ReactNode } from 'react'
import { AD } from '@/admin/adminUi'
import { cn } from '@/lib/utils'

/** Status pill with a color dot so state reads at a glance (green=open/ok, red=closed/blocked, orange=pending/warning). */
export function AdminBadge({
  label,
  className,
  dot = true,
}: {
  label: ReactNode
  className: string
  dot?: boolean
}) {
  return (
    <span className={cn(AD.badge, 'inline-flex items-center gap-1.5', className)}>
      {dot && <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />}
      {label}
    </span>
  )
}
