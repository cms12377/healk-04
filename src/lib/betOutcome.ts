export type BetOutcome = 'pending' | 'win' | 'lose'

export function resolveBetOutcome(status: string, isWin?: string | null): BetOutcome {
  if (status === '0') return 'pending'
  if (isWin === '1') return 'win'
  return 'lose'
}

export function betOutcomeLabel(outcome: BetOutcome): string {
  switch (outcome) {
    case 'pending':
      return 'รอผล'
    case 'win':
      return 'ชนะ'
    case 'lose':
      return 'แพ้'
  }
}

export function betOutcomeBadgeClass(outcome: BetOutcome): string {
  switch (outcome) {
    case 'pending':
      return 'bg-[#fff8e6] text-[#e65100]'
    case 'win':
      return 'bg-[#e8f5e9] text-[#2e7d32]'
    case 'lose':
      return 'bg-[#ffebee] text-[#c62828]'
  }
}
