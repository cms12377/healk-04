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

/** th6688 CheBian — one sidebar entry per play_group (non-PK10) */
export function buildGroupSidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  return betGroups.map((g) => ({
    id: g.id,
    label: translateGroupName(g.id, g.name),
    groupIds: [g.id],
  }))
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
