import { List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NoticeBar } from '@/components/common/NoticeBar'
import { PageNavBar } from '@/components/common/PageNavBar'
import { GamePickerPopup } from '@/components/game/GamePickerPopup'
import { ASSETS, GAME_LABELS } from '@/constants/assets'
import { fetchGames, fetchSiteNotice, fetchLotteries } from '@/services/api'
import type { GameItem, LotteryItem } from '@/types'

interface GamePageProps {
  onGameClick: (game: GameItem) => void
  onRulesClick: (game: GameItem) => void
  onBackHome?: () => void
}

export function GamePage({ onGameClick, onRulesClick, onBackHome }: GamePageProps) {
  const [games, setGames] = useState<GameItem[]>([])
  const [allLotteries, setAllLotteries] = useState<LotteryItem[]>([])
  const [notice, setNotice] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    fetchGames().then(setGames)
    fetchLotteries().then(setAllLotteries)
    fetchSiteNotice().then(setNotice)
  }, [])

  return (
    <div className="min-h-[100vh] bg-[#f5f5f9] pb-[60px]">
      <PageNavBar
        title="เกมทั้งหมด"
        variant="gradient"
        showBack={Boolean(onBackHome)}
        backLabel="กลับ"
        onBack={onBackHome}
        onRightClick={() => setShowPicker(true)}
        rightIcon={<List className="h-[23px] w-[23px] text-white" strokeWidth={2} />}
      />

      <NoticeBar text={notice} />

      <div
        className="mx-auto flex h-[120px] max-w-[700px] items-center justify-center bg-cover bg-center bg-no-repeat py-5"
        style={{ backgroundImage: `url(${ASSETS.gameBanner})` }}
      />

      <div className="grid grid-cols-3 gap-2.5 p-2.5 md:flex md:flex-wrap md:items-center md:gap-2.5">
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => onGameClick(game)}
            className="flex flex-col items-center justify-center gap-2.5 rounded-[5px] bg-[#f8fcff] p-2.5"
          >
            <img src={game.image} alt={game.name} className="h-16 w-full object-contain" />
            <span className="text-center text-[13px] font-normal text-[#333]">
              {GAME_LABELS[game.code] ?? game.name}
            </span>
          </button>
        ))}
      </div>

      {games.length > 0 && (
        <div className="px-2.5 pb-4">
          <button
            type="button"
            onClick={() => onRulesClick(games[0])}
            className="w-full rounded-lg border border-[#427ffa] bg-white py-2.5 text-sm text-[#427ffa]"
          >
            กติกาเกม (游戏规则)
          </button>
        </div>
      )}

      <GamePickerPopup
        open={showPicker}
        games={allLotteries}
        onClose={() => setShowPicker(false)}
        onSelect={(item) =>
          onGameClick({
            id: item.id,
            code: item.code,
            name: item.name,
            image: item.image,
            category: 'lottery',
          })
        }
      />
    </div>
  )
}
