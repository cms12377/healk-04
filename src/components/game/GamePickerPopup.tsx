import { X } from 'lucide-react'
import { GameCatalogGrid } from '@/components/game/GameCatalogGrid'
import type { LotteryItem } from '@/types'

interface GamePickerPopupProps {
  open: boolean
  games: LotteryItem[]
  currentCode?: string
  onClose: () => void
  onSelect: (item: LotteryItem) => void
}

export function GamePickerPopup({
  open,
  games,
  currentCode,
  onClose,
  onSelect,
}: GamePickerPopupProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-start sm:pt-16"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[700px] overflow-hidden rounded-t-2xl bg-[#f5f5f9] shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <div>
            <p className="text-base font-bold text-[#2c3345]">เปลี่ยนเกม</p>
            <p className="text-xs text-[#969799]">เลือกเกมที่ต้องการเล่น</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7fa] text-[#646566] ring-1 ring-[#ebedf0]"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 pb-6">
          <GameCatalogGrid
            items={games}
            title="เกมทั้งหมด"
            className="mx-0"
            onItemClick={(item) => {
              onSelect(item)
              onClose()
            }}
          />
          {currentCode && (
            <p className="mt-2 text-center text-[11px] text-[#969799]">
              กำลังเล่น: {games.find((g) => g.code === currentCode)?.name ?? currentCode}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
