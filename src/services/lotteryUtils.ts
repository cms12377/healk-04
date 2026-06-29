import type { LotteryGameType } from '@/types'

export const CODE_TO_GAME_TYPE: Record<string, LotteryGameType> = {
  df_pk10: 'pk10',
  df_pk10_3: 'pk10',
  df_pk10_5: 'pk10',
  df_k3: 'k3',
  xam_6: 'marksix',
  xy_28: 'lucky28',
  df_ssc: 'ssc',
}

export function getGameType(code: string): LotteryGameType {
  return CODE_TO_GAME_TYPE[code] ?? 'pk10'
}

export function calcBetTotal(amount: number, count: number) {
  return amount * count
}

export const GAME_ROUTES: Record<LotteryGameType, string> = {
  pk10: '/pkShi',
  k3: '/kuaisan',
  marksix: '/aoLiu',
  lucky28: '/xingyun',
  ssc: '/shiShiCai',
}

export function getGameRoute(code: string): string {
  return GAME_ROUTES[getGameType(code)] ?? '/pkShi'
}
