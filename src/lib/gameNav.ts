import type { BetGroup } from '@/services/lottery'
import type { LotteryGameType } from '@/types'
import { getGameType } from '@/services/lotteryUtils'
import {
  isRankGroupCode,
  isSumGroupCode,
  isTwoSideGroupCode,
  PK10_MAIN_TABS,
  translateGroupName,
  type Pk10MainTabKey,
} from '@/lib/gameLabels'

export interface SidebarTab {
  id: string
  label: string
  groupIds: string[]
}

/** th6688 df_k3 sidebar order (laoadmin play_groups) */
export const K3_SIDEBAR_ORDER = [
  'hz',
  'slh',
  'sth',
  'sbdh',
  'eth',
  'ebdh',
  'etdx',
] as const

export const K3_SIDEBAR_COUNT = K3_SIDEBAR_ORDER.length

/** Keep th6688 K3 tab order; drop legacy k3lm / unknown groups */
export function normalizeK3BetGroups(betGroups: BetGroup[]): BetGroup[] {
  const byId = new Map(betGroups.map((g) => [g.id, g]))
  return K3_SIDEBAR_ORDER.map((id) => byId.get(id)).filter(
    (g): g is BetGroup => g != null,
  )
}

/** th6688 CheBian — one sidebar entry per play_group (non-PK10) */
export function buildGroupSidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  return betGroups.map((g) => ({
    id: g.id,
    label: translateGroupName(g.id, g.name),
    groupIds: [g.id],
  }))
}

export function buildK3SidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  return buildGroupSidebarTabs(normalizeK3BetGroups(betGroups))
}

export function buildPk10SidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  const twoSide = betGroups.find((g) => isTwoSideGroupCode(g.id))
  const sumGroups = betGroups.filter((g) => isSumGroupCode(g.id))
  const rankGroups = betGroups.filter((g) => isRankGroupCode(g.id))

  const tabs: SidebarTab[] = []
  if (twoSide) tabs.push({ id: 'twoSide', label: PK10_MAIN_TABS.twoSide, groupIds: [twoSide.id] })
  if (sumGroups.length)
    tabs.push({ id: 'sum', label: PK10_MAIN_TABS.sum, groupIds: sumGroups.map((g) => g.id) })
  if (rankGroups.length)
    tabs.push({ id: 'rank', label: PK10_MAIN_TABS.rank, groupIds: rankGroups.map((g) => g.id) })
  return tabs
}

export function usesVerticalSidebar(gameType: LotteryGameType): boolean {
  return ['pk10', 'k3', 'marksix', 'lucky28', 'ssc'].includes(gameType)
}

export function getGameTypeFromCode(code: string): LotteryGameType {
  return getGameType(code)
}

export type { Pk10MainTabKey }
