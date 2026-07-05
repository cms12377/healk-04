import type { ReactNode } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { cn } from '@/lib/utils'

interface SubPageShellProps {
  title: string
  onBack: () => void
  variant?: 'gradient' | 'white'
  rightLabel?: string
  onRightClick?: () => void
  children: ReactNode
  className?: string
}

export function SubPageShell({
  title,
  onBack,
  variant = 'gradient',
  rightLabel,
  onRightClick,
  children,
  className,
}: SubPageShellProps) {
  return (
    <div className={cn('min-h-dvh bg-[#f5f5f9] pb-6', className)}>
      <PageNavBar
        title={title}
        variant={variant === 'white' ? 'white' : 'gradient'}
        showBack
        backLabel="กลับ"
        onBack={onBack}
        rightLabel={rightLabel}
        onRightClick={onRightClick}
      />
      {children}
    </div>
  )
}

export function SubCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SubEmptyState({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mx-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium text-[#646566]">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-[#969799]">{subtitle}</p>}
    </div>
  )
}

export function RecordCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-3 mb-2 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SubMenuRow({
  label,
  onClick,
  trailing,
  disabled,
}: {
  label: string
  onClick: () => void
  trailing?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-between border-b border-gray-100 px-4 py-3.5 text-left text-sm text-[#2c3345] transition last:border-0 hover:bg-[#f8faff] active:bg-[#eef2ff]',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent active:bg-transparent',
      )}
    >
      <span>{label}</span>
      {trailing ?? <span className="text-[#c8c9cc]">›</span>}
    </button>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-3 mt-3 animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-white ring-1 ring-black/5" />
      ))}
    </div>
  )
}
