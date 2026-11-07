import { BET_CHIP_IMAGES, normalizeQuickChips } from '@/lib/drawDisplay'
import { cn } from '@/lib/utils'
import { Wallet } from 'lucide-react'

interface GameBottomBarProps {
  balance: string
  amount: string
  activeChip: number | null
  chipAmounts?: number[]
  onAmountChange: (v: string) => void
  onChipAdd: (chip: number) => void
  onClear: () => void
  onSubmit: () => void
  submitting: boolean
  selectedCount: number
  total: number
  closed: boolean
  overlayLabel?: string
}

export function GameBottomBar({
  balance,
  amount,
  activeChip,
  chipAmounts,
  onAmountChange,
  onChipAdd,
  onClear,
  onSubmit,
  submitting,
  selectedCount,
  total,
  closed,
  overlayLabel = 'ปิดรับแทง',
}: GameBottomBarProps) {
  const chips = normalizeQuickChips(chipAmounts?.map(String))

  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border-t border-[#ebedf0]/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,0.1)] backdrop-blur-lg">
      {selectedCount > 0 && (
        <div className="border-b border-[#eef2ff] bg-[#f8faff] px-3 py-1 text-center text-sm font-medium text-[#4e72f3]">
          เลือก {selectedCount} รายการ · รวม {total.toLocaleString()} ฿
        </div>
      )}

      <div className="overflow-x-auto px-2 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1.5">
          {chips.map((chip) => {
            const img = BET_CHIP_IMAGES[chip as keyof typeof BET_CHIP_IMAGES]
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onChipAdd(chip)}
                className={cn(
                  'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cover bg-center bg-no-repeat transition-all',
                  activeChip === chip
                    ? '-translate-y-1 scale-105 ring-2 ring-[#4e72f3] ring-offset-2'
                    : 'hover:scale-105 active:scale-95',
                )}
                style={img ? { backgroundImage: `url(${img})` } : undefined}
                aria-label={`+${chip.toLocaleString()}`}
              >
                {!img && (
                  <span className="text-xs font-bold text-[#4e72f3]">
                    {chip >= 10000 ? `${chip / 10000}w` : chip}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-[#f5f7fa] px-2 py-1.5 ring-1 ring-[#ebedf0]">
            <Wallet className="h-5 w-5 shrink-0 text-[#4e72f3]" strokeWidth={2.2} aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#969799]">ยอดเงิน</p>
              <p className="truncate text-base font-bold text-[#2c3345]">{balance}</p>
            </div>
          </div>

          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="จำนวน"
            className="h-12 w-[80px] shrink-0 rounded-xl border border-[#ebedf0] bg-white text-center text-base font-semibold text-[#2c3345] outline-none ring-[#4e72f3] focus:border-[#4e72f3] focus:ring-2"
          />

          <button
            type="button"
            onClick={onClear}
            className="h-12 shrink-0 rounded-xl bg-[#fff3e0] px-2.5 text-sm font-semibold text-[#e65100] transition active:scale-95"
          >
            ล้าง
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="h-12 min-w-[76px] shrink-0 rounded-xl bg-gradient-to-r from-[#3880e5] to-[#4e72f3] px-3 text-base font-bold text-white shadow-md shadow-[#4e72f3]/25 transition active:scale-95 disabled:opacity-60"
          >
            {submitting ? '...' : 'ยืนยัน'}
          </button>
        </div>

        {closed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#323233]/75 backdrop-blur-sm">
            <span className="text-lg font-bold tracking-wide text-white">{overlayLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
