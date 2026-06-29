import { BET_CHIP_IMAGES, QUICK_CHIP_AMOUNTS } from '@/lib/drawDisplay'
import { cn } from '@/lib/utils'

interface GameBottomBarProps {
  balance: string
  amount: string
  activeChip: number | null
  onAmountChange: (v: string) => void
  onChipAdd: (chip: number) => void
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
  activeChip,
  onAmountChange,
  onChipAdd,
  onClear,
  onSubmit,
  submitting,
  selectedCount,
  total,
  closed,
}: GameBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border border-[#ccc] bg-[#d6dee9]">
      <div className="mx-2.5 max-w-[250px] box-border pt-2.5">
        <div className="scrollbox flex w-full max-w-[250px] gap-[3px] overflow-x-auto whitespace-nowrap">
          {QUICK_CHIP_AMOUNTS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipAdd(chip)}
              className={cn(
                'mr-[5px] inline-block h-[45px] w-[45px] shrink-0 rounded-full bg-cover bg-center bg-no-repeat transition-transform',
                activeChip === chip && '-translate-y-[10px]',
              )}
              style={{ backgroundImage: `url(${BET_CHIP_IMAGES[chip]})` }}
              aria-label={`+${chip}`}
            />
          ))}
        </div>
      </div>

      <div className="relative box-border flex items-center justify-between pr-[5px]">
        <div className="box-border flex flex-1 items-center justify-between p-2.5">
          <div className="flex items-center gap-[15px]">
            <div>
              <div className="text-[13px] text-[#333]">ยอดเงิน:</div>
              <div className="text-[12px] text-[#333]">{balance}</div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="borm !mr-[10px] h-10 w-[70px] rounded-[5px] border border-[#ccc] bg-white px-[3px] py-[5px] text-center text-sm outline-none"
            />
            <button
              type="button"
              onClick={onClear}
              className="rounded-[5px] bg-[#ffa663] px-2.5 py-[5px] text-[#fff]"
            >
              ล้าง
            </button>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="flex h-[35px] w-[75px] items-center justify-center rounded-[5px] bg-[#7aa6ff] text-[13px] font-bold text-white disabled:opacity-60"
          >
            {submitting ? '...' : 'ยืนยัน'}
          </button>
        </div>

        {closed && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-[rgba(0,0,0,.5)] text-[22px] text-white">
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
