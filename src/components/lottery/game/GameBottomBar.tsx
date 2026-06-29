import { QUICK_CHIP_AMOUNTS } from '@/lib/drawDisplay'
import { cn } from '@/lib/utils'

interface GameBottomBarProps {
  balance: string
  amount: string
  onAmountChange: (v: string) => void
  onClear: () => void
  onSubmit: () => void
  submitting: boolean
  selectedCount: number
  total: number
  closed: boolean
}

export function GameBottomBar({
  balance,
  amount,
  onAmountChange,
  onClear,
  onSubmit,
  submitting,
  selectedCount,
  total,
  closed,
}: GameBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border-t border-[#ccc] bg-[#d6dee9]">
      <div className="mx-2.5 max-w-[250px] overflow-x-auto pt-2.5">
        <div className="flex gap-1.5 whitespace-nowrap">
          {QUICK_CHIP_AMOUNTS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onAmountChange(String(Number(amount) + chip))}
              className={cn(
                'inline-flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                chip === 1000 && 'bg-[#7aa6ff]',
                chip === 5000 && 'bg-[#6298d6]',
                chip === 10000 && 'bg-[#ffa663]',
                chip === 50000 && 'bg-[#d7524e]',
              )}
            >
              {chip >= 10000 ? `${chip / 10000}w` : chip >= 1000 ? `${chip / 1000}k` : chip}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-between bg-white/60 px-2.5 py-2.5">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs text-[#333]">ยอดเงิน:</div>
            <div className="text-xs font-semibold">{balance}</div>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-[70px] rounded border border-[#ccc] bg-white px-1 py-1 text-center text-sm"
          />
          <button
            type="button"
            onClick={onClear}
            className="rounded bg-[#ffa663] px-2.5 py-1 text-xs text-white"
          >
            ล้าง
          </button>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex h-9 w-[75px] items-center justify-center rounded bg-[#7aa6ff] text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? '...' : 'ยืนยัน'}
        </button>

        {closed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-medium text-white">
            ปิดรับแทง
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="bg-[#7aa6ff]/20 px-3 py-1 text-center text-xs text-[#333]">
          เลือก {selectedCount} รายการ · รวม {total.toLocaleString()} ฿
        </div>
      )}
    </div>
  )
}
