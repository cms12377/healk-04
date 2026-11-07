import { Megaphone } from 'lucide-react'
import { MarqueeText } from '@/components/common/MarqueeText'

interface NoticeBarProps {
  text: string
}

export function NoticeBar({ text }: NoticeBarProps) {
  if (!text) return null

  return (
    <div className="sticky top-[46px] z-[998] flex items-center gap-2 overflow-hidden border-b border-[#ffe7ba] bg-[#fffbe8] px-3 py-2">
      <Megaphone className="h-4 w-4 shrink-0 text-[#ed6a0c]" strokeWidth={2.2} aria-hidden />
      <div className="min-w-0 flex-1 overflow-hidden">
        <MarqueeText
          text={text}
          className="text-sm font-medium text-[#ed6a0c]"
          pixelsPerSecond={28}
          minDuration={40}
        />
      </div>
    </div>
  )
}
