import { useEffect, useMemo, useState } from 'react'
import { PageNavBar, TabBar } from '@/components/common/PageNavBar'
import { GAME_LABELS } from '@/constants/assets'
import { fetchLotteries } from '@/services/api'
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
  const [lotteries, setLotteries] = useState<LotteryItem[]>([])
  const [categories, setCategories] = useState<LobbyCategory[]>([])
  const [activeTab, setActiveTab] = useState('')

  useEffect(() => {
    void Promise.all([fetchLotteries(), fetchLobbyCategories()]).then(([items, cats]) => {
      setLotteries(items)
      setCategories(cats)
      if (cats[0]) setActiveTab(cats[0].id)
    })
  }, [])

  const displayGames = useMemo(() => {
    if (filter === 'hot') return filterHotGames(lotteries)
    if (filter === 'all') return lotteries
    return filterLobbyGames(lotteries, activeTab)
  }, [lotteries, activeTab, filter])

  const title =
    filter === 'hot' ? 'หวยยอดนิยม' : filter === 'all' ? 'หวยทั้งหมด' : 'ล็อบบี้'

  return (
    <div className="min-h-[100vh] bg-[#f5f5f9] pb-4">
      <PageNavBar title={title} showBack backLabel="กลับ" onBack={onBack} />

      {!filter && categories.length > 0 && (
        <TabBar
          tabs={categories.map((c) => ({ value: c.id, label: c.name }))}
          active={activeTab}
          onChange={setActiveTab}
        />
      )}

      <div className="grid grid-cols-3 gap-2.5 p-2.5 md:flex md:flex-wrap md:items-center md:gap-2.5">
        {displayGames.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onLotteryClick(item)}
            className="flex flex-col items-center gap-2.5 rounded-[5px] bg-white p-2.5"
          >
            <img src={item.image} alt={item.name} className="w-full object-contain" />
            <span className="text-center text-[13px] text-[#333]">
              {GAME_LABELS[item.code] ?? item.name}
            </span>
          </button>
        ))}
      </div>

      {displayGames.length === 0 && (
        <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อมูล</p>
      )}
    </div>
  )
}
