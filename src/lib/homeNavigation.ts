import type { LotteryItem } from '@/types'

/** Quick-action codes on. home (4 tiles) */
export const HOME_QUICK_CODES: string[][] = [
  ['df_pk10', 'df_pk10_3', 'df_pk10_5'],
  ['df_k3'],
  ['xam_6'],
  ['xy_28'],
]

export function findLotteryByCodes(
  lotteries: LotteryItem[],
  codes: string[],
): LotteryItem | undefined {
  for (const code of codes) {
    const found = lotteries.find((l) => l.code === code)
    if (found) return found
  }
  return undefined
}

export function getLotteryDisplayName(item: LotteryItem): string {
  const labels: Record<string, string> = {
    df_pk10: 'PK10 10 นาที',
    df_pk10_3: 'PK10 3 นาที',
    df_pk10_5: 'PK10 5 นาที',
    df_k3: 'K3',
    xam_6: 'Mark Six (ฮ่องกง)',
    xy_28: 'Lucky 28',
    df_ssc: 'หวยรัฐบาล',
  }
  return labels[item.code] ?? item.name
}
