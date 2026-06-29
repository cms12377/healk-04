import { useEffect, useMemo, useState } from 'react'
import { ASSETS, DEFAULT_VIP_TIERS, VIP_BANNERS } from '@/constants/assets'
import { fetchVipTiers } from '@/services/api'
import { getLanguage } from '@/services/wallet'
import type { VipTier } from '@/types'

export function CaiJinPage() {
  const [tiers, setTiers] = useState<VipTier[]>(DEFAULT_VIP_TIERS)
  const [lang, setLang] = useState(getLanguage())

  useEffect(() => {
    fetchVipTiers()
      .then((rows) => {
        if (rows.length > 0) setTiers(rows)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const syncLang = () => setLang(getLanguage())
    syncLang()
    window.addEventListener('storage', syncLang)
    return () => window.removeEventListener('storage', syncLang)
  }, [])

  const bannerSrc = useMemo(() => {
    if (lang === 'th') return VIP_BANNERS.th
    if (lang === 'zh-cn' || lang === 'zh') return VIP_BANNERS.zh
    return VIP_BANNERS.en
  }, [lang])

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-[60px] pt-[60px]">
      <div className="fixed top-0 z-[999] flex w-full max-w-[700px] flex-col items-center justify-center bg-[#6390ff] px-2.5 py-[7px] text-[17px] font-semibold text-white">
        <div className="flex h-[30px] items-center justify-center rounded-[30px] px-4">
          ส่ง彩金 VIP
        </div>
      </div>

      <img src={bannerSrc} alt="VIP Banner" className="w-full object-cover" />

      <div className="grid grid-cols-4 gap-2.5 p-2.5">
        {tiers.map((tier) => (
          <div
            key={tier.level}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[40px] bg-white px-2.5 py-1.5"
          >
            <img
              src={tier.image || ASSETS.vip1}
              alt={`VIP ${tier.level}`}
              className="w-[50px] object-contain"
            />
            <div className="text-sm text-[#6390ff]">
              {tier.depositRequired.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
