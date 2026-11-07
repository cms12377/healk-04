import { Gift, Mail } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ASSETS, DEFAULT_VIP_TIERS, VIP_BANNERS } from '@/constants/assets'
import { useAuth } from '@/context/AuthContext'
import { fetchSiteMessages, fetchVipTiers } from '@/services/api'
import { getLanguage } from '@/services/wallet'
import type { VipTier } from '@/types'
import { cn } from '@/lib/utils'

interface CaiJinPageProps {
  onPromotionsClick?: () => void
  onMessagesClick?: () => void
}

export function CaiJinPage({ onPromotionsClick, onMessagesClick }: CaiJinPageProps) {
  const { isLoggedIn } = useAuth()
  const [tiers, setTiers] = useState<VipTier[]>(DEFAULT_VIP_TIERS)
  const [lang, setLang] = useState(getLanguage())
  const [unreadCount, setUnreadCount] = useState(0)

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

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0)
      return
    }
    fetchSiteMessages()
      .then((msgs) => setUnreadCount(msgs.filter((m) => !m.read).length))
      .catch(() => setUnreadCount(0))
  }, [isLoggedIn])

  const bannerSrc = useMemo(() => {
    if (lang === 'th') return VIP_BANNERS.th
    if (lang === 'zh-cn' || lang === 'zh') return VIP_BANNERS.zh
    return VIP_BANNERS.en
  }, [lang])

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-[60px] pt-[60px]">
      <div className="fixed top-0 z-[999] flex w-full max-w-[700px] items-center justify-between bg-[#6390ff] px-3 py-[7px] text-white">
        <div className="w-16" aria-hidden />
        <div className="flex h-[30px] items-center justify-center rounded-[30px] px-4 text-[17px] font-semibold">
          โบนัส VIP
        </div>
        <div className="flex w-16 items-center justify-end gap-1">
          {onPromotionsClick && (
            <button
              type="button"
              onClick={onPromotionsClick}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
              aria-label="โปรโมชั่น"
              title="โปรโมชั่น"
            >
              <Gift className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          {onMessagesClick && (
            <button
              type="button"
              onClick={onMessagesClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
              aria-label="ข้อความของฉัน"
              title="ข้อความของฉัน"
            >
              <Mail className="h-5 w-5" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ee0a24] px-1 text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <img src={bannerSrc} alt="VIP Banner" className="w-full object-cover" />

      <div className="grid grid-cols-2 gap-2.5 px-2.5 pt-2.5">
        {onPromotionsClick && (
          <button
            type="button"
            onClick={onPromotionsClick}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-left shadow-sm active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff3e0] text-[#ff9800]">
              <Gift className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#333]">โปรโมชั่น</span>
              <span className="text-xs text-[#888]">กิจกรรมและสิทธิพิเศษ</span>
            </span>
          </button>
        )}
        {onMessagesClick && (
          <button
            type="button"
            onClick={onMessagesClick}
            className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-left shadow-sm active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3f2fd] text-[#2196f3]">
              <Mail className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#333]">ข้อความของฉัน</span>
              <span className="text-xs text-[#888]">
                {unreadCount > 0 ? `${unreadCount} ยังไม่อ่าน` : 'ประกาศจากระบบ'}
              </span>
            </span>
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ee0a24]" />
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2.5 p-2.5">
        {tiers.map((tier) => (
          <div
            key={tier.level}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-1.5 rounded-[40px] bg-white px-2.5 py-1.5',
            )}
          >
            <img
              src={tier.image || ASSETS.vip1}
              alt={`VIP ${tier.level}`}
              className="w-[50px] object-contain"
            />
            <div className="text-sm text-[#6390ff]">{tier.depositRequired.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
