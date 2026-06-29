import { useEffect, useState } from 'react'
import { ASSETS } from '@/constants/assets'
import { fetchVipTiers } from '@/services/api'
import type { VipTier } from '@/types'
import { BonusSubNav } from './BonusSubNav'

interface CaiJinPageProps {
  onPromotionsClick: () => void
  onMessagesClick: () => void
}

export function CaiJinPage({ onPromotionsClick, onMessagesClick }: CaiJinPageProps) {
  const [tiers, setTiers] = useState<VipTier[]>([])

  useEffect(() => {
    fetchVipTiers().then(setTiers)
  }, [])

  return (
    <div className="min-h-screen bg-[#f5f5f9] pb-[60px]">
      <div className="sticky top-0 z-[999] bg-[#6390ff]">
        <div className="flex h-[46px] items-center justify-center text-[17px] font-semibold text-white">
          ส่ง彩金 VIP
        </div>
        <BonusSubNav
          active="caijin"
          onCaijin={() => undefined}
          onPromotions={onPromotionsClick}
          onMessages={onMessagesClick}
        />
      </div>

      <img
        src={ASSETS.vipBanner}
        alt="VIP Banner"
        className="w-full object-cover"
      />

      <div className="grid grid-cols-3 gap-2.5 p-2.5 sm:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.level}
            className="flex flex-col items-center gap-1.5 rounded-[40px] bg-white px-2.5 py-1.5"
          >
            <img src={tier.image} alt={`VIP ${tier.level}`} className="w-[50px] object-contain" />
            <div className="text-sm font-medium text-[#6390ff]">
              {tier.depositRequired.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-2.5 rounded-lg bg-white p-4 text-sm leading-relaxed text-[#555]">
        <p className="font-semibold text-[#333]">เงื่อนไขรับโบนัส VIP</p>
        <p className="mt-2">
          สมาชิกที่มียอดฝากสะสมถึงเกณฑ์แต่ละระดับ สามารถติดต่อฝ่ายบริการลูกค้าเพื่อรับโบนัสพิเศษ
          (送彩金) ได้ทันที
        </p>
      </div>
    </div>
  )
}
