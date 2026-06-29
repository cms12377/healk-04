import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchPromotions } from '@/services/api'
import type { ActivityCategory, Promotion } from '@/types'
import { cn } from '@/lib/utils'
import { BonusSubNav } from './BonusSubNav'

interface BonusPageProps {
  onBack?: () => void
  onCaijinClick?: () => void
  onMessagesClick?: () => void
}

const CATEGORIES: { id: ActivityCategory; label: string }[] = [
  { id: 68, label: 'โปรโมชั่นหวย' },
  { id: 69, label: 'โปรโมชั่นอื่นๆ' },
]

export function BonusPage({ onBack, onCaijinClick, onMessagesClick }: BonusPageProps) {
  const [category, setCategory] = useState<ActivityCategory>(68)
  const [promotions, setPromotions] = useState<Promotion[]>([])

  useEffect(() => {
    fetchPromotions(category).then(setPromotions)
  }, [category])

  return (
    <div className="min-h-[100vh] bg-[#e7e6c1] pb-[60px]">
      <PageNavBar
        title="โปรโมชั่น"
        showBack={Boolean(onBack)}
        backLabel="กลับ"
        onBack={onBack}
      />

      {onCaijinClick && onMessagesClick && (
        <BonusSubNav
          active="promotions"
          onCaijin={onCaijinClick}
          onPromotions={() => undefined}
          onMessages={onMessagesClick}
        />
      )}

      <div className="flex items-center px-3 py-2.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              'mr-2.5 h-[28px] cursor-pointer rounded-md border px-3 text-sm transition-colors',
              category === cat.id
                ? 'border-[#ff3b2f] bg-white text-[#ff3b2f]'
                : 'border-[#e5e5e5] bg-white text-[#333]',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="mx-2.5 flex flex-col gap-2.5 rounded-[10px] bg-white p-2.5"
          >
            <div className="text-lg font-bold text-black">{promo.title}</div>
            <div className="text-base text-[#333]">{promo.text}</div>
            <div className="flex w-full flex-col items-center justify-center">
              <img src={promo.images} alt={promo.title} className="w-full rounded-md object-cover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
