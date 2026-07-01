import { translateBetLabel } from '@/lib/gameLabels'

/** Shared game-detail typography & chips (larger text, tighter padding) */
export const BET_BODY_PAD = 'p-1'

export const BET_SIDE_CHIP =
  'flex h-9 min-w-[2.75rem] shrink-0 items-center justify-center rounded-md px-1.5 text-sm font-bold text-white shadow-sm'

export const BET_NUM_BOX =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#4e72f3] text-base font-bold text-[#4e72f3]'

export const BET_LABEL = 'text-base font-semibold text-[#2c3345]'

export const BET_PICK_META = 'text-base text-[#999]'

export const BET_CELL =
  'bet-item flex min-h-[48px] items-center justify-center gap-2 bg-white px-1 transition-all active:scale-[0.98]'

/** PK10 ผลรวม — fixed num/odds tracks; spacer pushes pair toward center gutter */
export const BET_CELL_PK10_SUM_LEFT =
  'bet-item grid w-full min-h-[48px] grid-cols-[1fr_2.25rem_3.25rem] items-center gap-x-1 bg-white py-1.5 pr-1.5 ring-1 ring-inset ring-[#dfe3eb] transition-all active:scale-[0.98]'

export const BET_CELL_PK10_SUM_RIGHT =
  'bet-item grid w-full min-h-[48px] grid-cols-[2.25rem_3.25rem_1fr] items-center gap-x-1 bg-white py-1.5 pl-1.5 ring-1 ring-inset ring-[#dfe3eb] transition-all active:scale-[0.98]'

/** Slightly stronger grid lines for sum tab */
export const BET_GRID_PK10_SUM = 'bet-row grid grid-cols-2 gap-[2px] bg-[#dfe3eb] p-[2px]'

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

export const BET_ODDS_ALIGN =
  'w-full text-right text-base font-semibold tabular-nums leading-none text-[#e53935]'

export const BET_ODDS_INLINE = 'shrink-0 text-sm font-semibold text-[#e53935]'

export const BET_SECTION = 'mb-1 overflow-visible rounded-xl bg-white ring-1 ring-gray-100'

export const BET_SECTION_HEADER =
  'border-b border-gray-100 bg-gradient-to-r from-[#f8faff] to-white px-3 py-2 text-center text-base font-semibold text-[#2c3345]'

export const BET_GRID = 'bet-row grid gap-px bg-gray-100 p-px'

/** K3 — stronger grid lines between bet cells */
export const BET_GRID_K3 = 'bet-row grid gap-[2px] bg-[#dfe3eb] p-[2px]'

export const BET_CELL_K3_RING = 'bg-white ring-1 ring-inset ring-[#dfe3eb]'

export const BET_SECTION_K3 =
  'mb-1 overflow-visible rounded-xl bg-white ring-1 ring-[#dfe3eb]'

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
