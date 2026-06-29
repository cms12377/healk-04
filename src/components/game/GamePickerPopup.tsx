import { GAME_LABELS } from '@/constants/assets'
import type { LotteryItem } from '@/types'

interface GamePickerPopupProps {
  open: boolean
  games: LotteryItem[]
  onClose: () => void
  onSelect: (item: LotteryItem) => void
}

export function GamePickerPopup({ open, games, onClose, onSelect }: GamePickerPopupProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 pt-10" onClick={onClose}>
      <div
        className="mx-auto grid max-w-[700px] grid-cols-3 gap-2.5 bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              onSelect(g)
              onClose()
            }}
            className="flex flex-col items-center gap-2 rounded bg-[#f8fcff] p-2.5 text-center"
          >
            <img src={g.image} alt={g.name} className="h-14 w-full object-contain" />
            <span className="text-xs text-[#333]">{GAME_LABELS[g.code] ?? g.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
