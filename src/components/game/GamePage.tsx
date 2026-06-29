import { BookOpen, Gamepad2, List, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NoticeBar } from '@/components/common/NoticeBar'
import { PageNavBar } from '@/components/common/PageNavBar'
import { GameCatalogGrid, GameCatalogGridSkeleton } from '@/components/game/GameCatalogGrid'
import { HomeSideDrawer } from '@/components/home/HomeSideDrawer'
import { fetchLotteries, fetchSiteNotice } from '@/services/api'
import type { GameItem, LotteryItem, SubPage } from '@/types'

interface GamePageProps {
  onGameClick: (game: GameItem) => void
  onRulesClick: (game: GameItem) => void
  onBackHome?: () => void
  onNavigateSub: (page: SubPage, params?: Record<string, string>) => void
  onServiceClick: () => void
}

function GamePageHero({ gameCount }: { gameCount: number }) {
  return (
    <section className="relative mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] px-5 py-6 shadow-lg shadow-[#3880e5]/20">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 right-12 h-24 w-24 rounded-full bg-white/5"
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
          <Gamepad2 className="h-6 w-6 text-white" strokeWidth={2.2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
            Game Center
          </p>
          <h2 className="mt-0.5 text-lg font-bold leading-snug text-white">
            เลือกเกมที่ต้องการ
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-white/85">
            หวยครบ {gameCount > 0 ? `${gameCount} ประเภท` : 'ทุกประเภท'} — แทงได้ตลอด 24 ชม.
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20">
          <Sparkles className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          PK10 · K3 · Mark Six
        </span>
        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20">
          Lucky 28 · หวยรัฐบาล
        </span>
      </div>
    </section>
  )
}

export function GamePage({
  onGameClick,
  onRulesClick,
  onBackHome,
  onNavigateSub,
  onServiceClick,
}: GamePageProps) {
  const [games, setGames] = useState<LotteryItem[]>([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    void Promise.all([fetchLotteries(), fetchSiteNotice()])
      .then(([items, siteNotice]) => {
        setGames(items)
        setNotice(siteNotice)
      })
      .finally(() => setLoading(false))
  }, [])

  const rulesGame = useMemo(
    () => games.find((g) => g.isHot) ?? games.find((g) => g.code === 'df_pk10') ?? games[0],
    [games],
  )

  const openGame = (item: LotteryItem) => {
    onGameClick({
      id: item.id,
      code: item.code,
      name: item.name,
      image: item.image,
      category: 'lottery',
    })
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f9] pb-[72px]">
      <PageNavBar
        title="เกมทั้งหมด"
        variant="gradient"
        showBack={Boolean(onBackHome)}
        backLabel="กลับ"
        onBack={onBackHome}
        onRightClick={() => setShowDrawer(true)}
        rightIcon={<List className="h-[23px] w-[23px] text-white" strokeWidth={2} />}
      />

      {notice && <NoticeBar text={notice} />}

      <div className="space-y-3 pb-4 pt-1">
        <GamePageHero gameCount={games.length} />

        {loading ? (
          <GameCatalogGridSkeleton />
        ) : games.length > 0 ? (
          <>
            <GameCatalogGrid
              items={games}
              onItemClick={openGame}
              className="mx-3"
            />

            {rulesGame && (
              <div className="mx-3 overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4e72f3]">
                    <BookOpen className="h-5 w-5" strokeWidth={2.2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2c3345]">กติกาและวิธีเล่น</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#888]">
                      อ่านรายละเอียดกติกา อัตราจ่าย และวิธีแทงก่อนเริ่มเล่น
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onRulesClick({
                          id: rulesGame.id,
                          code: rulesGame.code,
                          name: rulesGame.name,
                          image: rulesGame.image,
                          category: 'lottery',
                        })
                      }
                      className="mt-2.5 rounded-full bg-[#eef2ff] px-4 py-1.5 text-xs font-semibold text-[#4e72f3] transition hover:bg-[#e0e7ff] active:scale-[0.98]"
                    >
                      ดูกติกาเกม
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mx-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
            <Gamepad2 className="mx-auto h-10 w-10 text-[#c8c9cc]" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-[#646566]">ยังไม่มีเกมที่เปิดให้บริการ</p>
            <p className="mt-1 text-xs text-[#969799]">กรุณาลองใหม่ภายหลัง</p>
          </div>
        )}
      </div>

      <HomeSideDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onNavigate={onNavigateSub}
        onServiceClick={onServiceClick}
      />
    </div>
  )
}
