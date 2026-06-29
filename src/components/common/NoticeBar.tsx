interface NoticeBarProps {
  text: string
}

export function NoticeBar({ text }: NoticeBarProps) {
  if (!text) return null

  return (
    <div className="sticky top-[46px] z-[998] overflow-hidden bg-[#fffbe8] px-3 py-1.5 text-sm text-[#ed6a0c]">
      <div className="animate-marquee whitespace-nowrap">{text}</div>
    </div>
  )
}
