interface BonusSubNavProps {
  active: 'caijin' | 'promotions' | 'messages'
  onCaijin: () => void
  onPromotions: () => void
  onMessages: () => void
}

export function BonusSubNav({ active, onCaijin, onPromotions, onMessages }: BonusSubNavProps) {
  const items = [
    { key: 'caijin' as const, label: 'ส่ง彩金 VIP', onClick: onCaijin },
    { key: 'promotions' as const, label: 'โปรโมชั่น', onClick: onPromotions },
    { key: 'messages' as const, label: 'ข้อความ', onClick: onMessages },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto bg-[#6390ff] px-3 py-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === item.key
              ? 'bg-white text-[#6390ff]'
              : 'bg-white/20 text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
