import { translateBetLabel, translateGroupName } from '@/lib/gameLabels'
import type { SelectedBetItem } from '@/types'

interface BetConfirmModalProps {
  open: boolean
  bets: SelectedBetItem[]
  amount: number
  total: number
  onClose: () => void
  onConfirm: () => void
  confirming: boolean
}

export function BetConfirmModal({
  open,
  bets,
  amount,
  total,
  onClose,
  onConfirm,
  confirming,
}: BetConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-[700px] rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <h3 className="mb-3 text-center text-base font-semibold text-[#333]">ยืนยันการเดิมพัน</h3>
        <div className="max-h-[50vh] overflow-y-auto">
          {bets.map((b) => (
            <div
              key={b.option.id}
              className="flex items-center justify-between border-b border-[#eee] py-2 text-sm"
            >
              <span className="text-[#333]">
                {translateGroupName('', b.groupName)} · {translateBetLabel(b.option.label)}
              </span>
              <span className="text-[#d7524e]">{amount.toLocaleString()} ฿</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-semibold">
          <span>รวม {bets.length} รายการ</span>
          <span className="text-[#d7524e]">{total.toLocaleString()} ฿</span>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#ddd] py-2.5 text-sm text-[#333]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 rounded-lg bg-[#7aa6ff] py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {confirming ? 'กำลังส่ง...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  )
}
