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
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[700px] rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
        <h3 className="mb-1 text-center text-base font-bold text-[#2c3345]">ยืนยันการเดิมพัน</h3>
        <p className="mb-3 text-center text-xs text-[#969799]">
          ตรวจสอบรายการก่อนยืนยัน
        </p>

        <div className="max-h-[45vh] overflow-y-auto rounded-xl bg-[#fafbfc] ring-1 ring-gray-100">
          {bets.map((b) => (
            <div
              key={b.option.id}
              className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 text-sm last:border-0"
            >
              <span className="min-w-0 pr-2 text-[#2c3345]">
                {translateGroupName('', b.groupName)} · {translateBetLabel(b.option.label)}
              </span>
              <span className="shrink-0 font-semibold text-[#e53935]">
                {amount.toLocaleString()} ฿
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#eef2ff] px-3 py-2.5 text-sm font-bold">
          <span className="text-[#535867]">รวม {bets.length} รายการ</span>
          <span className="text-[#4e72f3]">{total.toLocaleString()} ฿</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#ebedf0] py-2.5 text-sm font-semibold text-[#646566] transition active:scale-[0.98]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#3880e5] to-[#4e72f3] py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
          >
            {confirming ? 'กำลังส่ง...' : 'ยืนยันเดิมพัน'}
          </button>
        </div>
      </div>
    </div>
  )
}
