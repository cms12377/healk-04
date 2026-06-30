import { translateBetLabel } from '@/lib/gameLabels'

/** Shared game-detail typography & chips (larger text, tighter padding) */
export const BET_BODY_PAD = 'p-1'

export const BET_SIDE_CHIP =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base font-bold text-white shadow-sm'

export const BET_NUM_BOX =
  'flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-[#4e72f3] px-1 text-base font-bold text-[#4e72f3]'

export const BET_LABEL = 'text-base font-semibold text-[#2c3345]'

export const BET_PICK_META = 'text-base text-[#999]'

export const BET_CELL =
  'bet-item flex min-h-[48px] items-center justify-center gap-2 bg-white px-1 transition-all active:scale-[0.98]'

export const BET_CELL_COLUMN =
  'bet-item flex min-h-[48px] flex-col items-center justify-center gap-0.5 bg-white py-1 px-0.5 transition-all active:scale-[0.98]'

export const BET_CELL_ROW =
  'bet-item flex min-h-[48px] items-center justify-between bg-white px-2 transition-all active:scale-[0.98]'

/** K3 — label/dice and red odds on one row (th6688) */
export const BET_CELL_K3 =
  'bet-item flex min-h-[48px] flex-row flex-nowrap items-center justify-center gap-2 bg-white px-1 py-1 transition-all active:scale-[0.98]'

export const BET_SELECTED =
  'border-2 border-[#4e72f3] bg-[#eef2ff] shadow-sm ring-1 ring-[#4e72f3]/15'

export const BET_ODDS = 'shrink-0 text-base font-semibold text-[#e53935]'

export const BET_ODDS_INLINE = 'shrink-0 text-sm font-semibold text-[#e53935]'

export const BET_SECTION = 'mb-1 overflow-visible rounded-xl bg-white ring-1 ring-gray-100'

export const BET_SECTION_HEADER =
  'border-b border-gray-100 bg-gradient-to-r from-[#f8faff] to-white px-2 py-1.5 text-center text-base font-semibold text-[#2c3345]'

export const BET_GRID = 'bet-row grid gap-px bg-gray-100 p-px'

export const BET_TAB_ACTIVE = 'border-[#4e72f3] bg-[#4e72f3] text-white shadow-sm'

export const BET_TAB_INACTIVE =
  'border-[#ebedf0] bg-white text-[#535867] hover:bg-[#f8faff]'

export const BET_TAB_HAS_PICK = 'ring-1 ring-[#4e72f3]/40'

export function sideChipClass(label: string): string {
  const l = translateBetLabel(label)
  if (
    ['สูง', 'ใหญ่', 'คี่', 'มังกร', 'รวมสูง', 'รวมคี่', 'รวมใหญ่', '大', '单', '龙', '总大', '总单', 'แดง'].includes(l) ||
    ['大', '单', '龙', '总大', '总单', 'ใหญ่', 'คี่', 'มังกร', '红波'].includes(label)
  ) {
    return 'bg-[#006cd5]'
  }
  if (
    ['ต่ำ', 'เล็ก', 'คู่', 'เสือ', 'รวมต่ำ', 'รวมคู่', 'รวมเล็ก', '小', '双', '虎', '总小', '总双', 'เขียว'].includes(l) ||
    ['小', '双', '虎', '总小', '总双', 'เล็ก', 'คู่', 'เสือ', '绿波'].includes(label)
  ) {
    return 'bg-[#ffa735]'
  }
  if (l === 'เสมอ' || label === '和') return 'bg-[#54db46]'
  if (l === 'น้ำเงิน' || label === '蓝波') return 'bg-[#006cd5]'
  return 'bg-[#4e72f3]'
}
