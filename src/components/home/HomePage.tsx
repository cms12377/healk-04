import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/common/AppHeader'
import { NoticeBar } from '@/components/common/NoticeBar'
import { ASSETS, GAME_LABELS } from '@/constants/assets'
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

const QUICK_ACTIONS = [
  { key: 'pk10', label: 'PK10 10 นาที', bg: 'h1' as const, code: 'df_pk10' },
  { key: 'k3', label: 'K3', bg: 'h2' as const, code: 'df_k3' },
  { key: 'marksix', label: 'Mark Six (ฮ่องกง)', bg: 'h3' as const, code: 'xam_6' },
  { key: 'lucky28', label: 'Lucky 28', bg: 'h4' as const, code: 'xy_28' },
]

const CATEGORY_CARDS = [
  { key: 'hot', label: 'หวยยอดนิยม', image: 'hotLottery' as const, width: 'w-[148px]' },
  { key: 'all', label: 'ทั้งหมด', image: 'all' as const, width: 'w-[110px]' },
  { key: 'lobby', label: 'ล็อบบี้', image: 'lobby' as const, width: 'w-[120px]', action: 'lobby' as const },
]

function getLotteryLabel(item: LotteryItem) {
  return GAME_LABELS[item.code] ?? item.name
}

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

  return (
    <div className="lottery-home pb-[60px] font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[#333]">
      <AppHeader onLoginClick={onLoginClick} />

      {data?.notice && <NoticeBar text={data.notice} />}

      {data?.winners && data.winners.length > 0 && (
        <div className="overflow-hidden bg-[#fff8e6] px-3 py-1.5 text-xs text-[#666]">
          <div className="animate-marquee whitespace-nowrap">
            {data.winners.map((w) => (
              <span key={w.id} className="mr-8">
                ยินดีด้วย {w.username} ถูกรางวัล {w.gamesName} จำนวน {w.winAmount.toLocaleString()} บาท
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="relative h-[150px] overflow-hidden bg-[#3880e5]">
        {banners.map((banner, index) => (
          <img
            key={banner.id}
            src={banner.image}
            alt=""
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              index === bannerIndex ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
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
              onClick={
                card.key === 'lobby'
                  ? onLobbyClick
                  : card.key === 'hot'
                    ? onHotClick
                    : card.key === 'all'
                      ? onAllClick
                      : undefined
              }
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
            {QUICK_ACTIONS.map((action) => {
              const lottery = lotteries.find((l) => l.code === action.code)
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => lottery && onLotteryClick(lottery)}
                  className="flex w-full flex-col items-center justify-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${quickBgImages[action.bg]})`,
                    backgroundSize: '100% auto',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="mt-10 text-center text-xs font-semibold text-white">{action.label}</span>
                </button>
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
                {getLotteryLabel(item)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
