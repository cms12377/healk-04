import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/common/AppHeader'
import { NoticeBar } from '@/components/common/NoticeBar'
import { ASSETS } from '@/constants/assets'
import {
  findLotteryByCodes,
  getLotteryDisplayName,
  HOME_QUICK_CODES,
} from '@/lib/homeNavigation'
import { fetchHomeData } from '@/services/api'
import type { HomeData, LotteryItem } from '@/types'
import { cn } from '@/lib/utils'

interface HomePageProps {
  onLoginClick: () => void
  onLotteryClick: (item: LotteryItem) => void
  onLobbyClick: () => void
  onHotClick: () => void
  onAllClick: () => void
}

const categoryImages = {
  hotLottery: ASSETS.hotLottery,
  all: ASSETS.all,
  lobby: ASSETS.lobby,
}

const quickBgImages = {
  h1: ASSETS.h1,
  h2: ASSETS.h2,
  h3: ASSETS.h3,
  h4: ASSETS.h4,
}

const QUICK_BG_KEYS = ['h1', 'h2', 'h3', 'h4'] as const

const CATEGORY_CARDS = [
  { key: 'hot', label: 'หวยยอดนิยม', image: 'hotLottery' as const, width: 'w-[148px]' },
  { key: 'all', label: 'ทั้งหมด', image: 'all' as const, width: 'w-[110px]' },
  { key: 'lobby', label: 'ล็อบบี้', image: 'lobby' as const, width: 'w-[120px]' },
]

export function HomePage({
  onLoginClick,
  onLotteryClick,
  onLobbyClick,
  onHotClick,
  onAllClick,
}: HomePageProps) {
  const [data, setData] = useState<HomeData | null>(null)
  const [bannerIndex, setBannerIndex] = useState(0)

  useEffect(() => {
    fetchHomeData().then(setData)
  }, [])

  useEffect(() => {
    if (!data || data.carousel.length <= 1) return
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % data.carousel.length)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [data])

  const lotteries = data?.lotteries ?? []
  const banners = data?.carousel ?? []

  const openBanner = (url?: string) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCategory = (key: string) => {
    if (key === 'hot') onHotClick()
    else if (key === 'all') onAllClick()
    else if (key === 'lobby') onLobbyClick()
  }

  return (
    <div className="lottery-home pb-[60px] font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[#333]">
      <AppHeader onLoginClick={onLoginClick} />

      {data?.notice && <NoticeBar text={data.notice} />}

      {data?.winners && data.winners.length > 0 && (
        <div className="overflow-hidden bg-[#fff8e6] px-3 py-1.5 text-xs text-[#666]">
          <div className="animate-marquee whitespace-nowrap">
            {data.winners.map((w) => (
              <span key={w.id} className="mr-8">
                ยินดีด้วย {w.username} ถูกรางวัล {w.gamesName} จำนวน{' '}
                {w.winAmount.toLocaleString()} บาท
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="relative h-[150px] overflow-hidden bg-[#3880e5]">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => openBanner(banner.url)}
            className={cn(
              'absolute inset-0 h-full w-full transition-opacity duration-500',
              banner.url ? 'cursor-pointer' : 'cursor-default',
              index === bannerIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <img src={banner.image} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {banners.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, index) => (
              <span
                key={banner.id}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  index === bannerIndex ? 'bg-white' : 'bg-white/40',
                )}
              />
            ))}
          </div>
        )}
      </section>

      <div className="box-border">
        <div className="actions flex justify-between px-2.5 py-2.5 md:justify-evenly">
          {CATEGORY_CARDS.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => handleCategory(card.key)}
              className={cn(
                'relative box-border h-[130px] overflow-hidden rounded-lg p-5',
                card.width,
              )}
            >
              <img
                src={categoryImages[card.image]}
                alt={card.label}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute bottom-[15px] left-[15px] text-lg font-medium text-white md:bottom-[30px] md:left-[50px] md:text-[30px]">
                {card.label}
              </span>
            </button>
          ))}
        </div>

        <div className="px-2.5">
          <div
            className="relative mb-5 grid h-[100px] grid-cols-4 overflow-hidden rounded-[20px]"
            style={{ background: 'linear-gradient(to bottom, #fab37f 0%, #ee5b5a 100%)' }}
          >
            {HOME_QUICK_CODES.map((codes, index) => {
              const lottery = findLotteryByCodes(lotteries, codes)
              const label = lottery
                ? getLotteryDisplayName(lottery)
                : ['PK10', 'K3', 'Mark Six', 'Lucky 28'][index]
              return (
                <div
                  key={codes.join('-')}
                  className="flex w-full flex-col items-center justify-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${quickBgImages[QUICK_BG_KEYS[index]]})`,
                    backgroundSize: '100% auto',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="mt-10 text-center text-xs font-semibold text-white">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid w-full grid-cols-3 border border-[#e5e5e5]">
          {lotteries.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onLotteryClick(item)}
              className="borrb flex w-full flex-col items-center justify-center border-b border-r border-[#e5e5e5] bg-white p-2.5"
            >
              <img src={item.image} alt={item.name} className="h-20 w-20 object-contain" />
              <div className="mt-1 text-center text-sm font-semibold text-[#535867]">
                {getLotteryDisplayName(item)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
