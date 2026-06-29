import { User } from 'lucide-react'
import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

const SIZE_MAP = {
  sm: { box: 'h-7 w-7', icon: 14 },
  md: { box: 'h-8 w-8', icon: 16 },
  lg: { box: 'h-10 w-10', icon: 20 },
} as const

interface UserAvatarProps {
  src?: string | null
  name?: string
  size?: keyof typeof SIZE_MAP
  variant?: 'header' | 'default'
  className?: string
  onClick?: (e: MouseEvent) => void
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  variant = 'default',
  className,
  onClick,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false)
  const trimmed = src?.trim()
  const showFallback = !trimmed || failed
  const { box, icon } = SIZE_MAP[size]

  const fallbackClass =
    variant === 'header'
      ? 'bg-white/20 text-white ring-2 ring-white/40'
      : 'bg-[#eef2ff] text-[#4e72f3] ring-2 ring-white shadow-sm'

  const shared = cn(box, 'shrink-0 rounded-full', onClick && 'cursor-pointer', className)

  if (showFallback) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') onClick(e as unknown as MouseEvent)
              }
            : undefined
        }
        className={cn(shared, 'flex items-center justify-center', fallbackClass)}
        aria-label={name ? `โปรไฟล์ ${name}` : 'โปรไฟล์ผู้ใช้'}
      >
        <User size={icon} strokeWidth={2.2} aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={trimmed}
      alt={name ?? ''}
      onClick={onClick}
      onError={() => setFailed(true)}
      className={cn(
        shared,
        'object-cover',
        variant === 'header' ? 'ring-2 ring-white/40' : 'ring-2 ring-white shadow-sm',
      )}
    />
  )
}
