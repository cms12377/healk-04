import type { BetGroup } from '@/services/lottery'
import type { LotteryGameType } from '@/types'
import { getGameType } from '@/services/lotteryUtils'
import {
  isRankGroupCode,
  isSumGroupCode,
  isTwoSideGroupCode,
  LUCKY28_MAIN_TABS,
  PK10_MAIN_TABS,
  SSC_MAIN_TABS,
  translateGroupName,
  type Lucky28MainTabKey,
  type Pk10MainTabKey,
  type SscMainTabKey,
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

/** th6688 Lucky28 — 整合 | 定位球 | 特码 */
export function buildLucky28SidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  const tabs: SidebarTab[] = []
  if (betGroups.some((g) => g.id === 'lm28')) {
    tabs.push({ id: 'integrate', label: LUCKY28_MAIN_TABS.integrate, groupIds: ['lm28'] })
  }
  const ballIds = ['ball1', 'b2', 'b3'].filter((id) => betGroups.some((g) => g.id === id))
  if (ballIds.length) {
    tabs.push({ id: 'balls', label: LUCKY28_MAIN_TABS.balls, groupIds: ballIds })
  }
  if (betGroups.some((g) => g.id === 'hz28')) {
    tabs.push({ id: 'sum', label: LUCKY28_MAIN_TABS.sum, groupIds: ['hz28'] })
  }
  return tabs
}

/** th6688 SSC — 两面 | 1-5球 */
export function buildSscSidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  const tabs: SidebarTab[] = []
  if (
    betGroups.some((g) => g.id === 'sum' || g.id === 'ball1' || g.id === 'nn')
  ) {
    tabs.push({
      id: 'twoSide',
      label: SSC_MAIN_TABS.twoSide,
      groupIds: ['sum', 'ball1', 'b2', 'b3', 'b4', 'b5', 'nn'].filter((id) =>
        betGroups.some((g) => g.id === id),
      ),
    })
  }
  const ballIds = ['ball1', 'b2', 'b3', 'b4', 'b5'].filter((id) =>
    betGroups.some((g) => g.id === id),
  )
  if (ballIds.length) {
    tabs.push({ id: 'balls', label: SSC_MAIN_TABS.balls, groupIds: ballIds })
  }
  return tabs
}

export function usesVerticalSidebar(gameType: LotteryGameType): boolean {
  return ['pk10', 'k3', 'marksix', 'lucky28', 'ssc'].includes(gameType)
}

export function getGameTypeFromCode(code: string): LotteryGameType {
  return getGameType(code)
}

export type { Lucky28MainTabKey, Pk10MainTabKey, SscMainTabKey }
