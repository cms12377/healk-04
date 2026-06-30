import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminNavBarProps {
  title: string
  variant?: 'blue' | 'gradient'
  showBack?: boolean
  backLabel?: string
  onBack?: () => void
  rightLabel?: string
  onRightClick?: () => void
}

export function AdminNavBar({
  title,
  variant = 'blue',
  showBack = false,
  backLabel = 'กลับ',
  onBack,
  rightLabel,
  onRightClick,
}: AdminNavBarProps) {
  const isGradient = variant === 'gradient'

  return (
    <header
      className={cn(
        'fixed top-0 z-[1000] flex h-16 w-full items-center justify-center px-4 text-white',
        isGradient ? 'bg-gradient-to-r from-[#3880e5] to-[#86a7ff]' : 'bg-[#427ffa]',
      )}
    >
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 flex items-center gap-1 text-lg font-medium"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
          <span>{backLabel}</span>
        </button>
      ) : null}
      <span className="text-xl font-semibold">{title}</span>
      {rightLabel && onRightClick ? (
        <button
          type="button"
          onClick={onRightClick}
          className="absolute right-3 text-lg font-medium"
        >
          {rightLabel}
        </button>
      ) : null}
    </header>
  )
}
