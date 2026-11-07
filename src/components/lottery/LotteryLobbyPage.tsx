import { Gamepad2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageNavBar, TabBar } from '@/components/common/PageNavBar'
import { GameCatalogGrid, GameCatalogGridSkeleton } from '@/components/game/GameCatalogGrid'
import { useLotteries } from '@/hooks/useLotteries'
import {
  fetchLobbyCategories,
  filterHotGames,
  filterLobbyGames,
  type LobbyCategory,
} from '@/services/lottery'
import type { LotteryItem } from '@/types'

interface LotteryLobbyPageProps {
  filter?: 'hot' | 'all'
  onBack: () => void
  onLotteryClick: (item: LotteryItem) => void
}

export function LotteryLobbyPage({ filter, onBack, onLotteryClick }: LotteryLobbyPageProps) {
  const { lotteries, loading: lotteriesLoading } = useLotteries()
  const [categories, setCategories] = useState<LobbyCategory[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [catsLoading, setCatsLoading] = useState(!filter)

  useEffect(() => {
    if (filter) return
    void fetchLobbyCategories()
      .then((cats) => {
        setCategories(cats)
        if (cats[0]) setActiveTab(cats[0].id)
      })
      .finally(() => setCatsLoading(false))
  }, [filter])

  const loading = lotteriesLoading || catsLoading

  const displayGames = useMemo(() => {
    if (filter === 'hot') return filterHotGames(lotteries)
    if (filter === 'all') return lotteries
    return filterLobbyGames(lotteries, activeTab)
  }, [lotteries, activeTab, filter])

  const title =
    filter === 'hot' ? 'หวยยอดนิยม' : filter === 'all' ? 'หวยทั้งหมด' : 'ล็อบบี้หวย'

  const gridTitle =
    filter === 'hot'
      ? 'หวยยอดนิยม'
      : filter === 'all'
        ? 'หวยทั้งหมด'
        : categories.find((c) => c.id === activeTab)?.name ?? 'เกมในหมวด'

  return (
    <div className="min-h-dvh bg-[#f5f5f9] pb-[72px]">
      <PageNavBar title={title} variant="gradient" showBack backLabel="กลับ" onBack={onBack} />

      {!filter && categories.length > 0 && (
        <TabBar
          tabs={categories.map((c) => ({ value: c.id, label: c.name }))}
          active={activeTab}
          onChange={setActiveTab}
        />
      )}

      <div className="space-y-3 pb-4 pt-3">
        {loading ? (
          <GameCatalogGridSkeleton className="mx-3" />
        ) : displayGames.length > 0 ? (
          <GameCatalogGrid
            items={displayGames}
            onItemClick={onLotteryClick}
            title={gridTitle}
            className="mx-3"
          />
        ) : (
          <div className="mx-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
            <Gamepad2 className="mx-auto h-10 w-10 text-[#c8c9cc]" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-[#646566]">ไม่มีเกมในหมวดนี้</p>
            <p className="mt-1 text-xs text-[#969799]">ลองเลือกหมวดอื่นหรือกลับมาใหม่ภายหลัง</p>
          </div>
        )}
      </div>
    </div>
  )
}
