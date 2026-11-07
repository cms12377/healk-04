import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface GameToastProps {
  message: string
  onDismiss: () => void
  duration?: number
}

export function GameToast({ message, onDismiss, duration = 3000 }: GameToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  const isSuccess = message.startsWith('✅')

  return (
    <div
      className="fixed left-1/2 top-20 z-[1001] w-[min(calc(100%-24px),420px)] -translate-x-1/2"
      role="status"
    >
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'w-full rounded-2xl px-4 py-3 text-left text-sm font-medium shadow-lg ring-1 backdrop-blur-md',
          isSuccess
            ? 'bg-[#e8f5e9]/95 text-[#2e7d32] ring-[#a5d6a7]'
            : 'bg-[#323233]/90 text-white ring-white/10',
        )}
      >
        {message}
      </button>
    </div>
  )
}
