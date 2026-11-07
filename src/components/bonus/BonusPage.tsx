import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchPromotions } from '@/services/api'
import type { ActivityCategory, Promotion } from '@/types'
import { cn } from '@/lib/utils'

interface BonusPageProps {
  onBack?: () => void
}

const CATEGORIES: { id: ActivityCategory; label: string }[] = [
  { id: 68, label: 'โปรโมชั่นหวย' },
  { id: 69, label: 'โปรโมชั่นอื่นๆ' },
]

export function BonusPage({ onBack }: BonusPageProps) {
  const [category, setCategory] = useState<ActivityCategory>(68)
  const [promotions, setPromotions] = useState<Promotion[]>([])

  useEffect(() => {
    fetchPromotions(category).then(setPromotions).catch(() => setPromotions([]))
  }, [category])

  return (
    <div className="min-h-[100vh] bg-[#e7e6c1] pb-4">
      <PageNavBar
        title="โปรโมชั่น"
        showBack={Boolean(onBack)}
        backLabel="กลับ"
        onBack={onBack}
      />

      <div className="bar-demo flex items-center px-3 py-2.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              'mr-2.5 h-[28px] cursor-pointer rounded-md border border-[#e5e5e5] bg-white px-3 text-sm text-[#333] transition-colors',
              category === cat.id && 'border-[#ff3b2f] text-[#ff3b2f]',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5 pb-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="mx-2.5 flex flex-col gap-2.5 rounded-[10px] bg-white p-2.5"
          >
            <div className="text-lg font-bold text-black">{promo.title}</div>
            <div className="text-base text-[#333]">{promo.text}</div>
            <div className="flex w-full flex-col items-center justify-center">
              {promo.images ? (
                <img
                  src={promo.images}
                  alt={promo.title}
                  className="w-full rounded-md object-cover"
                />
              ) : null}
            </div>
          </div>
        ))}

        {promotions.length === 0 && (
          <p className="py-10 text-center text-sm text-[#666]">ไม่มีโปรโมชั่นในหมวดนี้</p>
        )}
      </div>
    </div>
  )
}
