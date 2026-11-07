import type { ReactNode } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminNavBar } from '@/admin/components/AdminNavBar'
import { cn } from '@/lib/utils'

interface AdminPageLayoutProps {
  title: string
  children: ReactNode
  variant?: 'blue' | 'gradient'
  showBack?: boolean
  backLabel?: string
  onBack?: () => void
  rightLabel?: string
  onRightClick?: () => void
  className?: string
  contentClassName?: string
}

export function AdminPageLayout({
  title,
  children,
  variant = 'blue',
  showBack,
  backLabel,
  onBack,
  rightLabel,
  onRightClick,
  className,
  contentClassName,
}: AdminPageLayoutProps) {
  return (
    <div className={cn(AD.shell, AD.shellPad, className)}>
      <AdminNavBar
        title={title}
        variant={variant}
        showBack={showBack}
        backLabel={backLabel}
        onBack={onBack}
        rightLabel={rightLabel}
        onRightClick={onRightClick}
      />
      <div className={cn(contentClassName)}>{children}</div>
    </div>
  )
}
