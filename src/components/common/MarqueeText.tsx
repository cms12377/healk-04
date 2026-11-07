import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface MarqueeTextProps {
  text: string
  className?: string
  /** Scroll speed in px/s — lower = slower */
  pixelsPerSecond?: number
  /** Stagger start so multiple bars don't move in sync */
  delay?: number
  /** Minimum loop duration in seconds */
  minDuration?: number
}

export function MarqueeText({
  text,
  className,
  pixelsPerSecond = 32,
  delay = 0,
  minDuration = 35,
}: MarqueeTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [duration, setDuration] = useState(minDuration)

  const content = `${text}\u3000\u3000${text}`

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const halfWidth = el.scrollWidth / 2
    const seconds = Math.max(minDuration, halfWidth / pixelsPerSecond)
    setDuration(seconds)
  }, [text, pixelsPerSecond, minDuration])

  return (
    <span
      ref={ref}
      className={cn('marquee-track whitespace-nowrap', className)}
      style={
        {
          '--marquee-duration': `${duration}s`,
          '--marquee-delay': `${delay}s`,
        } as CSSProperties
      }
    >
      {content}
    </span>
  )
}
