import { Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/common/AppHeader'
import { MarqueeText } from '@/components/common/MarqueeText'
import { NoticeBar } from '@/components/common/NoticeBar'
import { GameCatalogGrid } from '@/components/game/GameCatalogGrid'
import { ASSETS } from '@/constants/assets'
import {
  findLotteryByCodes,
  getLotteryDisplayName,
  HOME_QUICK_CODES,
} from '@/lib/homeNavigation'
import { fetchHomeData } from '@/services/api'
import type { HomeData, LotteryItem, WinningItem } from '@/types'
import { cn } from '@/lib/utils'

interface HomePageProps {
  onLoginClick: () => void
  onLotteryClick: (item: LotteryItem) => void
  onLobbyClick: () => void
  onHotClick: () => void
  onAllClick: () => void
}

const CATEGORY_CARDS = [
  {
    key: 'hot',
    label: 'หวยยอดนิยม',
    sub: 'Hot picks',
    image: ASSETS.hotLottery,
    width: 'flex-[1.35]',
  },
  {
    key: 'all',
    label: 'ทั้งหมด',
    sub: 'All games',
    image: ASSETS.all,
    width: 'flex-1',
  },
  {
    key: 'lobby',
    label: 'ล็อบบี้',
    sub: 'Lobby',
    image: ASSETS.lobby,
    width: 'flex-1',
  },
] as const

const QUICK_BG = [ASSETS.h1, ASSETS.h2, ASSETS.h3, ASSETS.h4] as const
const QUICK_FALLBACK = ['PK10', 'K3', 'Mark Six', 'Lucky 28'] as const

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-3 pt-3">
      <div className="h-[160px] rounded-2xl bg-white/80" />
      <div className="flex gap-2">
        <div className="h-[120px] flex-[1.35] rounded-xl bg-white/80" />
        <div className="h-[120px] flex-1 rounded-xl bg-white/80" />
        <div className="h-[120px] flex-1 rounded-xl bg-white/80" />
      </div>
      <div className="h-[96px] rounded-2xl bg-white/80" />
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-gray-200">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-white/90" />
        ))}
      </div>
    </div>
  )
}

function WinnersBar({ winners }: { winners: WinningItem[] }) {
  const text = winners
    .map(
      (w) =>
        `ยินดีด้วย ${w.username} ถูกรางวัล ${w.gamesName} ${w.winAmount.toLocaleString()} บาท`,
    )
    .join('　　')

  return (
    <div className="flex items-center gap-2 border-b border-[#ffe8c2] bg-gradient-to-r from-[#fff8e6] to-[#fff3d6] px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff9800]/15">
        <Trophy className="h-4 w-4 text-[#e65100]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <MarqueeText
          text={text}
          className="text-xs font-medium text-[#8d6e3a]"
          pixelsPerSecond={30}
          minDuration={45}
          delay={12}
        />
      </div>
    </div>
  )
}

function BannerCarousel({
  banners,
}: {
  banners: HomeData['carousel']
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) {
    return (
      <div className="mx-3 mt-3 flex h-[160px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] to-[#86a7ff] shadow-lg shadow-[#3880e5]/20">
        <p className="text-sm font-medium text-white/90">ยินดีต้อนรับ</p>
      </div>
    )
  }

  return (
    <section className="relative mx-3 mt-3">
      <div className="relative h-[160px] overflow-hidden rounded-2xl bg-[#3880e5] shadow-lg shadow-[#3880e5]/20 ring-1 ring-black/5">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => {
              if (banner.url) window.open(banner.url, '_blank', 'noopener,noreferrer')
            }}
            className={cn(
              'absolute inset-0 h-full w-full transition-opacity duration-700 ease-out',
              banner.url ? 'cursor-pointer' : 'cursor-default',
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <img
              src={banner.image}
              alt=""
              className="h-full w-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
          </button>
        ))}

        {banners.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function HomePage({
  onLoginClick,
  onLotteryClick,
  onLobbyClick,
  onHotClick,
  onAllClick,
}: HomePageProps) {
  const [data, setData] = useState<HomeData | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetchHomeData()
      .then(setData)
      .catch(() => setLoadError(true))
  }, [])

  const lotteries = data?.lotteries ?? []

  const handleCategory = (key: string) => {
    if (key === 'hot') onHotClick()
    else if (key === 'all') onAllClick()
    else if (key === 'lobby') onLobbyClick()
  }

  const handleQuick = (codes: string[]) => {
    const lottery = findLotteryByCodes(lotteries, codes)
    if (lottery) onLotteryClick(lottery)
  }

  return (
    <div className="lottery-home min-h-full pb-[68px] font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[#333]">
      <AppHeader onLoginClick={onLoginClick} />

      {data?.notice && <NoticeBar text={data.notice} />}

      {data?.winners && data.winners.length > 0 && <WinnersBar winners={data.winners} />}

      {!data && !loadError && <HomeSkeleton />}

      {loadError && (
        <div className="mx-3 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ — ลองรีเฟรชหน้า
        </div>
      )}

      {data && (
        <>
          <BannerCarousel banners={data.carousel} />

          {/* Category shortcuts */}
          <div className="flex gap-2 px-3 py-3">
            {CATEGORY_CARDS.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => handleCategory(card.key)}
                className={cn(
                  'group relative h-[120px] min-w-0 overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 transition active:scale-[0.98]',
                  card.width,
                )}
              >
                <img
                  src={card.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3 text-left">
                  <p className="text-base font-bold leading-tight text-white drop-shadow-sm">
                    {card.label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/75">
                    {card.sub}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Quick game bar */}
          <div className="px-3 pb-4">
            <div className="overflow-hidden rounded-2xl shadow-md ring-1 ring-[#ee5b5a]/20">
              <div
                className="grid h-[96px] grid-cols-4"
                style={{ background: 'linear-gradient(180deg, #ffc49a 0%, #ee5b5a 100%)' }}
              >
                {HOME_QUICK_CODES.map((codes, index) => {
                  const lottery = findLotteryByCodes(lotteries, codes)
                  const label = lottery
                    ? getLotteryDisplayName(lottery)
                    : QUICK_FALLBACK[index]
                  const disabled = !lottery

                  return (
                    <button
                      key={codes.join('-')}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleQuick(codes)}
                      className={cn(
                        'relative flex flex-col items-center justify-end bg-bottom bg-no-repeat pb-2 transition active:scale-95',
                        disabled ? 'cursor-not-allowed opacity-60' : 'hover:brightness-110',
                      )}
                      style={{
                        backgroundImage: `url(${QUICK_BG[index]})`,
                        backgroundSize: '100% auto',
                        backgroundPosition: 'center top',
                      }}
                    >
                      <span className="mt-8 max-w-full truncate px-1 text-center text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Game grid */}
          <GameCatalogGrid
            items={lotteries}
            onItemClick={onLotteryClick}
            className="mx-3"
          />
        </>
      )}
    </div>
  )
}
