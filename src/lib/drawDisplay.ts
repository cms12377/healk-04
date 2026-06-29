import type { LotteryGameType } from '@/types'

/** PK10 official-style ball colors (1–10) */
export const PK10_BALL_CLASS: Record<number, string> = {
  1: 'bg-[#e6de00] text-[#333]',
  2: 'bg-[#0092dd] text-white',
  3: 'bg-[#4b4b4b] text-white',
  4: 'bg-[#ff7600] text-white',
  5: 'bg-[#17e2e5] text-[#333]',
  6: 'bg-[#5234ff] text-white',
  7: 'bg-[#bfbfbf] text-[#333]',
  8: 'bg-[#ff2600] text-white',
  9: 'bg-[#780b00] text-white',
  10: 'bg-[#07bf00] text-white',
}

const MARK_SIX_RED = new Set([
  1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46,
])
const MARK_SIX_GREEN = new Set([
  5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49,
])

export function markSixBallClass(n: string | number): string {
  const num = Number(n)
  if (Number.isNaN(num)) return 'bg-[#3a81e5] text-white'
  if (MARK_SIX_RED.has(num)) return 'bg-[#d7524e] text-white'
  if (MARK_SIX_GREEN.has(num)) return 'bg-[#54db46] text-[#333]'
  return 'bg-[#006cd5] text-white'
}

export function k3CellClass(label: string, index: number): string {
  if (index <= 2) return `bgi${label} borh`
  if (label === '大' || label === '单' || label === '龙') return 'bg-[#006cd5]'
  if (label === '小' || label === '双' || label === '虎') return 'bg-[#ffa735]'
  if (label === '和') return 'bg-[#54db46]'
  return 'bor !text-[#3a81e5]'
}

export function labelChipClass(label: string): string {
  if (['大', '单', '龙', '红', '红波'].includes(label)) return 'bg-[#006cd5]'
  if (['小', '双', '虎', '绿', '绿波'].includes(label)) return 'bg-[#ffa735]'
  if (['和', '蓝', '蓝波'].includes(label)) return 'bg-[#54db46]'
  return 'bg-[#6298d6]'
}

export interface ParsedDrawAnalyz {
  dx?: string
  ds?: string
  wave?: string
  zodiac?: string[]
  result?: string[]
  dxList?: string[]
  dsList?: string[]
}

export function parseAnalyz(raw: unknown): ParsedDrawAnalyz {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const split = (v: unknown) =>
    typeof v === 'string' ? v.split(/[,，\s]+/).filter(Boolean) : undefined
  return {
    dx: typeof o.dx === 'string' ? o.dx : undefined,
    ds: typeof o.ds === 'string' ? o.ds : undefined,
    wave: typeof o.wave === 'string' ? o.wave : undefined,
    zodiac: split(o.zodiac),
    result: split(o.result),
    dxList: split(o.dx),
    dsList: split(o.ds),
  }
}

export function issueShort(issue: string, digits = 3): string {
  if (!issue) return '---'
  const parts = issue.split('-')
  const tail = parts.length > 1 ? parts[parts.length - 1] : issue
  return tail.slice(-digits) || issue.slice(-digits)
}

export function issuePrev(issue: string): string {
  const parts = issue.split('-')
  if (parts.length >= 3) {
    const n = Number(parts[2])
    if (!Number.isNaN(n)) return String(Math.max(0, n - 1)).padStart(parts[2].length, '0')
  }
  const n = Number(issue.slice(-3))
  if (!Number.isNaN(n)) return String(Math.max(0, n - 1)).padStart(3, '0')
  return '---'
}

export function lucky28Sum(numbers: string[]): number {
  return numbers.reduce((s, n) => s + (Number(n) || 0), 0)
}

export function splitMarkSix(numbers: string[]): { regular: string[]; special: string[] } {
  if (numbers.length <= 6) return { regular: numbers, special: [] }
  return { regular: numbers.slice(0, 6), special: [numbers[numbers.length - 1]] }
}

export const HISTORY_TABS: Record<
  LotteryGameType,
  { value: string; label: string }[]
> = {
  pk10: [
    { value: '1', label: '号码' },
    { value: '2', label: '大小' },
    { value: '3', label: '单双' },
    { value: '4', label: '冠亚' },
  ],
  k3: [{ value: '1', label: '号码' }],
  marksix: [{ value: '1', label: '号码' }],
  lucky28: [{ value: '1', label: '号码' }],
  ssc: [
    { value: '1', label: '号码' },
    { value: '2', label: '大小' },
    { value: '3', label: '单双' },
    { value: '4', label: '形态' },
  ],
}

export function deriveAnalyzFromNumbers(
  gameType: LotteryGameType,
  numbers: string[],
): ParsedDrawAnalyz {
  if (gameType === 'pk10' || gameType === 'ssc') {
    return {
      dxList: numbers.map((n) => (Number(n) >= 5 ? '大' : '小')),
      dsList: numbers.map((n) => (Number(n) % 2 === 1 ? '单' : '双')),
    }
  }
  if (gameType === 'k3') {
    const sum = lucky28Sum(numbers.slice(0, 3))
    return {
      dx: sum >= 11 ? '大' : '小',
      ds: sum % 2 === 1 ? '单' : '双',
      result: numbers.slice(0, 3),
    }
  }
  if (gameType === 'lucky28') {
    const sum = lucky28Sum(numbers.slice(0, 3))
    return {
      dx: sum >= 14 ? '大' : '小',
      ds: sum % 2 === 1 ? '单' : '双',
      wave: sum % 3 === 0 ? '红' : sum % 3 === 1 ? '绿' : '蓝',
    }
  }
  return {}
}

export const QUICK_CHIP_AMOUNTS = [1000, 5000, 10000, 50000] as const
