import { getGameType } from '@/services/lotteryUtils'
import { lucky28Sum } from '@/lib/drawDisplay'

/** Parse draw result string into number array */
export function parseDrawNumbers(result: string): number[] {
  return result
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
}

/** PK10 rank big/small: 6–10 big, 1–5 small */
function pk10RankBig(n: number): boolean {
  return n >= 6
}

function odd(n: number): boolean {
  return n % 2 === 1
}

/** Mark Six 2026 zodiac map (number → animal code) — simplified static table */
const MARK_SIX_ZODIAC: Record<number, string> = {
  1: 'snake', 13: 'snake', 25: 'snake', 37: 'snake', 49: 'snake',
  2: 'dragon', 14: 'dragon', 26: 'dragon', 38: 'dragon',
  3: 'rabbit', 15: 'rabbit', 27: 'rabbit', 39: 'rabbit',
  4: 'tiger', 16: 'tiger', 28: 'tiger', 40: 'tiger',
  5: 'ox', 17: 'ox', 29: 'ox', 41: 'ox',
  6: 'rat', 18: 'rat', 30: 'rat', 42: 'rat',
  7: 'pig', 19: 'pig', 31: 'pig', 43: 'pig',
  8: 'dog', 20: 'dog', 32: 'dog', 44: 'dog',
  9: 'rooster', 21: 'rooster', 33: 'rooster', 45: 'rooster',
  10: 'monkey', 22: 'monkey', 34: 'monkey', 46: 'monkey',
  11: 'goat', 23: 'goat', 35: 'goat', 47: 'goat',
  12: 'horse', 24: 'horse', 36: 'horse', 48: 'horse',
}

const MARK_SIX_RED = new Set([
  1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46,
])
const MARK_SIX_GREEN = new Set([
  5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49,
])

function markSixWave(n: number): 'red' | 'green' | 'blue' {
  if (MARK_SIX_RED.has(n)) return 'red'
  if (MARK_SIX_GREEN.has(n)) return 'green'
  return 'blue'
}

/** SSC 牛牛 — returns 0 for 牛牛, 1–9 for 牛1–牛9, -1 for 无牛 */
export function calcNiuNiu(nums: number[]): number {
  if (nums.length < 5) return -1
  const arr = nums.slice(0, 5)
  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      for (let k = j + 1; k < 5; k++) {
        const triple = arr[i] + arr[j] + arr[k]
        if (triple % 10 !== 0) continue
        const rest = arr.filter((_, idx) => idx !== i && idx !== j && idx !== k)
        const mod = (rest[0] + rest[1]) % 10
        return mod === 0 ? 0 : mod
      }
    }
  }
  return -1
}

function niuBetCode(niu: number): string {
  if (niu === 0) return 'niuniu'
  if (niu === -1) return 'wuniu'
  return `niu${niu}`
}

function k3IsStraight(dice: number[]): boolean {
  const s = [...dice].sort((a, b) => a - b)
  return s[0] + 1 === s[1] && s[1] + 1 === s[2]
}

function matchSide(code: string, value: number, bigThreshold: number): boolean {
  switch (code) {
    case 'big':
    case 'total_big':
    case 'k3_big':
      return value >= bigThreshold
    case 'small':
    case 'total_small':
    case 'k3_small':
      return value < bigThreshold
    case 'odd':
    case 'total_odd':
    case 'k3_odd':
      return odd(value)
    case 'even':
    case 'total_even':
    case 'k3_even':
      return !odd(value)
    default:
      return false
  }
}

export interface BetEvalContext {
  gameCode: string
  groupCode: string
  betContent: string
  resultNumbers: number[]
}

/**
 * Returns true if the bet wins against the draw result.
 * Mirrors th6688 settlement rules for all 7 game codes.
 */
export function evaluateBetWin(ctx: BetEvalContext): boolean {
  const { gameCode, groupCode, betContent: bc } = ctx
  const nums = ctx.resultNumbers
  const gameType = getGameType(gameCode)

  if (nums.length === 0) return false

  // --- PK10 family ---
  if (gameType === 'pk10') {
    const rankMatch = bc.match(/^lm_r(\d+)_(big|small|odd|even|dragon|tiger)$/)
    if (rankMatch) {
      const rank = Number(rankMatch[1])
      const side = rankMatch[2]
      const val = nums[rank - 1]
      if (val == null) return false
      if (side === 'big') return pk10RankBig(val)
      if (side === 'small') return !pk10RankBig(val)
      if (side === 'odd') return odd(val)
      if (side === 'even') return !odd(val)
      if (side === 'dragon') {
        const opp = nums[10 - rank]
        return opp != null && val > opp
      }
      if (side === 'tiger') {
        const opp = nums[10 - rank]
        return opp != null && val < opp
      }
    }

    const gySum = bc.match(/^gy_sum_(\d+)$/)
    if (gySum) {
      const target = Number(gySum[1])
      return nums[0] + nums[1] === target
    }

    if (bc.startsWith('gy_')) {
      const sum = nums[0] + nums[1]
      if (bc === 'gy_big') return sum >= 12
      if (bc === 'gy_small') return sum <= 11
      if (bc === 'gy_odd') return odd(sum)
      if (bc === 'gy_even') return !odd(sum)
    }

    if (bc.startsWith('gyj_')) {
      const sum = nums[0] + nums[1] + nums[2]
      if (bc === 'gyj_big') return sum >= 17
      if (bc === 'gyj_small') return sum <= 16
      if (bc === 'gyj_odd') return odd(sum)
      if (bc === 'gyj_even') return !odd(sum)
    }

    const rankNum = bc.match(/^n(\d+)$/)
    if (rankNum && /^r\d+$/.test(groupCode)) {
      const pick = Number(rankNum[1])
      const rank = Number(groupCode.slice(1))
      return nums[rank - 1] === pick
    }

    if (['big', 'small', 'odd', 'even', 'dragon', 'tiger'].includes(bc) && groupCode === 'lm') {
      const val = nums[0]
      if (bc === 'dragon') return nums[0] > nums[9]
      if (bc === 'tiger') return nums[0] < nums[9]
      return matchSide(bc, val, 6)
    }
  }

  // --- K3 (th6688 full catalog) ---
  if (gameType === 'k3') {
    const dice = nums.slice(0, 3)
    const sum = lucky28Sum(dice.map(String))
    const sorted = [...dice].sort((a, b) => a - b)

    const sideCodes = new Set([
      'big', 'small', 'odd', 'even',
      'total_big', 'total_small', 'total_odd', 'total_even',
      'k3_big', 'k3_small', 'k3_odd', 'k3_even',
    ])

    if (groupCode === 'hz' || sideCodes.has(bc)) {
      if (sideCodes.has(bc)) return matchSide(bc, sum, 11)
      const n = Number(bc)
      if (Number.isInteger(n) && n >= 3 && n <= 18) return sum === n
      const legacy = bc.match(/^sum_(\d+)$/)
      if (legacy) return sum === Number(legacy[1])
    }

    if (groupCode === 'sth' || /^(\d)\1\1$/.test(bc)) {
      const triple = bc.match(/^(\d)\1\1$/)
      const legacy = bc.match(/^triple_(\d)$/)
      const d = triple ? Number(triple[1]) : legacy ? Number(legacy[1]) : NaN
      if (!Number.isNaN(d)) return dice.every((n) => n === d)
    }

    if (groupCode === 'slh') {
      const straight = bc.match(/^(\d)(\d)(\d)$/)
      if (straight) {
        const want = straight.slice(1, 4).map(Number)
        return (
          sorted[0] === want[0] &&
          sorted[1] === want[1] &&
          sorted[2] === want[2] &&
          sorted[1] === sorted[0] + 1 &&
          sorted[2] === sorted[1] + 1
        )
      }
      if (bc === 'straight') return k3IsStraight(dice)
    }

    if (groupCode === 'eth' || /^(\d)\1$/.test(bc)) {
      const pair = bc.match(/^(\d)\1$/)
      if (pair) {
        const d = Number(pair[1])
        return dice.filter((n) => n === d).length === 2
      }
    }

    if (groupCode === 'sbdh' && /^[1-6]{3}$/.test(bc)) {
      const uniq = [...new Set(dice)]
      if (uniq.length !== 3) return false
      const want = bc.split('').map(Number).sort((a, b) => a - b)
      return sorted.every((v, i) => v === want[i])
    }

    if (groupCode === 'ebdh' && /^[1-6]{2}$/.test(bc)) {
      const a = Number(bc[0])
      const b = Number(bc[1])
      return a !== b && dice.includes(a) && dice.includes(b)
    }

    if (groupCode === 'etdx' && /^[1-6]{3}$/.test(bc)) {
      const want = bc.split('').map(Number).sort((a, b) => a - b)
      return sorted.every((v, i) => v === want[i])
    }
  }

  // --- Mark Six ---
  if (gameType === 'marksix') {
    const regular = nums.slice(0, 6)
    const special = nums[nums.length - 1]

    const tm = bc.match(/^tm_(\d+)$/)
    if (tm) return special === Number(tm[1])

    const zm = bc.match(/^zm_(\d+)$/)
    if (zm) return regular.includes(Number(zm[1]))

    if (groupCode === 'tx') return MARK_SIX_ZODIAC[special] === bc
    if (groupCode === 'zx') {
      return regular.some((n) => MARK_SIX_ZODIAC[n] === bc)
    }

    if (bc === 'red') return markSixWave(special) === 'red'
    if (bc === 'green') return markSixWave(special) === 'green'
    if (bc === 'blue') return markSixWave(special) === 'blue'

    if (groupCode === 'lm') {
      const total = lucky28Sum(nums.map(String))
      return matchSide(bc.startsWith('total_') ? bc : `total_${bc}`, total, 175)
    }
  }

  // --- Lucky 28 ---
  if (gameType === 'lucky28') {
    const balls = nums.slice(0, 3)
    const sum = lucky28Sum(balls.map(String))

    const ballBet = bc.match(/^(ball1|b2|b3)_(\d+)$/)
    if (ballBet) {
      const idx = ballBet[1] === 'ball1' ? 0 : ballBet[1] === 'b2' ? 1 : 2
      return balls[idx] === Number(ballBet[2])
    }

    const sumBet = bc.match(/^sum_(\d+)$/)
    if (sumBet) return sum === Number(sumBet[1])

    if (bc === 'wave_red') return sum % 3 === 0
    if (bc === 'wave_green') return sum % 3 === 1
    if (bc === 'wave_blue') return sum % 3 === 2

    if (groupCode === 'lm28') {
      if (['big', 'small', 'odd', 'even'].includes(bc)) {
        if (bc === 'big') return sum >= 14
        if (bc === 'small') return sum < 14
        if (bc === 'odd') return odd(sum)
        if (bc === 'even') return !odd(sum)
      }
      return matchSide(bc, sum, 14)
    }
  }

  // --- SSC ---
  if (gameType === 'ssc') {
    const balls = nums.slice(0, 5)

    const ballBet = bc.match(/^(ball1|b[2-5])_(\d+)$/)
    if (ballBet) {
      const g = ballBet[1]
      const idx = g === 'ball1' ? 0 : Number(g.slice(1)) - 1
      return balls[idx] === Number(ballBet[2])
    }

    if (groupCode === 'ball1' && ['big', 'small', 'odd', 'even'].includes(bc)) {
      return matchSide(bc, balls[0], 5)
    }

    if (groupCode === 'nn') {
      const niu = calcNiuNiu(balls)
      return niuBetCode(niu) === bc
    }
  }

  return false
}

/** Sanitize bet content like th6688 submit (strip commas) */
export function sanitizeBetContent(raw: string): string {
  return raw.replace(/[,，、]/g, '')
}
