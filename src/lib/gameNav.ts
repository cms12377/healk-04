import type { BetGroup } from '@/services/lottery'
import type { BetOption, LotteryGameType } from '@/types'
import { getGameType } from '@/services/lotteryUtils'
import {
  isRankGroupCode,
  isTwoSideGroupCode,
  LUCKY28_MAIN_TABS,
  PK10_MAIN_TABS,
  SSC_MAIN_TABS,
  translateGroupName,
  translateSumCategoryHeader,
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

/** th6688 xam_6 sidebar — 4 tabs only (特码 | 正码 | 特肖 | 正肖) */
export const MARKSIX_SIDEBAR_ORDER = ['tm', 'zm', 'tx', 'zx'] as const

export function normalizeMarksixBetGroups(betGroups: BetGroup[]): BetGroup[] {
  const byId = new Map(betGroups.map((g) => [g.id, g]))
  return MARKSIX_SIDEBAR_ORDER.map((id) => byId.get(id)).filter(
    (g): g is BetGroup => g != null,
  )
}

export function buildMarksixSidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  return buildGroupSidebarTabs(normalizeMarksixBetGroups(betGroups))
}

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

/** PK10 ผลรวม tab — sum numbers 3–19 only (no gy side bets, no gyj) */
export function isPk10GySumNumberOption(opt: BetOption): boolean {
  const num = Number(opt.label)
  return /^\d+$/.test(opt.label) && num >= 3 && num <= 19
}

export function buildPk10SumCategories(
  gyGroup: BetGroup | undefined,
): NonNullable<BetGroup['categories']> {
  if (!gyGroup || gyGroup.id !== 'gy') return []

  if (gyGroup.categories && gyGroup.categories.length > 0) {
    return gyGroup.categories
      .map((cat) => ({
        ...cat,
        options: cat.options.filter(isPk10GySumNumberOption),
      }))
      .filter((cat) => cat.options.length > 0)
  }

  const options = gyGroup.options.filter(isPk10GySumNumberOption)
  if (options.length === 0) return []
  return [
    {
      id: gyGroup.id,
      name: translateSumCategoryHeader(gyGroup.id, gyGroup.name),
      options,
    },
  ]
}

export function pk10GyGroup(betGroups: BetGroup[]): BetGroup | undefined {
  return betGroups.find((g) => g.id === 'gy')
}

export function hasPk10SumTab(betGroups: BetGroup[]): boolean {
  return buildPk10SumCategories(pk10GyGroup(betGroups)).length > 0
}

const LUCKY28_INTEGRATE_BETS = new Set([
  'big',
  'small',
  'odd',
  'even',
  'bigOdd',
  'bigEven',
  'smallEdd',
  'smallEven',
  'bigBig',
  'smallSmall',
  'baozi',
  'shunzi',
  'duizi',
  'dragon',
  'tiger',
  'he',
  'red',
  'green',
  'blue',
  'wave_red',
  'wave_green',
  'wave_blue',
])

export function lucky28GroupOptions(group: BetGroup): BetOption[] {
  return [
    ...group.options,
    ...(group.categories?.flatMap((c) => c.options) ?? []),
  ]
}

/** hz28 / 总和 — bet on sum total 0–27 */
export function isLucky28SumGroup(group: BetGroup): boolean {
  return lucky28GroupOptions(group).some((o) => /^sum_\d+$/.test(o.betContent ?? ''))
}

/** lm28 / 整合 — big/small/combos/wave side bets */
export function isLucky28IntegrateGroup(group: BetGroup): boolean {
  return lucky28GroupOptions(group).some((o) =>
    LUCKY28_INTEGRATE_BETS.has(o.betContent ?? ''),
  )
}

export function buildLucky28Nav(groups: BetGroup[]) {
  return {
    sum: groups.find(isLucky28SumGroup) ?? groups.find((g) => g.id === 'hz28'),
    integrate:
      groups.find(isLucky28IntegrateGroup) ?? groups.find((g) => g.id === 'lm28'),
    ballGroups: groups.filter((g) => ['ball1', 'b2', 'b3'].includes(g.id)),
  }
}

export function lucky28GroupForTab(
  tab: Lucky28MainTabKey,
  nav: ReturnType<typeof buildLucky28Nav>,
): BetGroup | undefined {
  if (tab === 'sum') return nav.sum
  if (tab === 'integrate') return nav.integrate
  return undefined
}

export function buildPk10SidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  const twoSide = betGroups.find((g) => isTwoSideGroupCode(g.id))
  const rankGroups = betGroups.filter((g) => isRankGroupCode(g.id))

  const tabs: SidebarTab[] = []
  if (twoSide) tabs.push({ id: 'twoSide', label: PK10_MAIN_TABS.twoSide, groupIds: [twoSide.id] })
  if (hasPk10SumTab(betGroups)) {
    tabs.push({ id: 'sum', label: PK10_MAIN_TABS.sum, groupIds: ['gy'] })
  }
  if (rankGroups.length)
    tabs.push({ id: 'rank', label: PK10_MAIN_TABS.rank, groupIds: rankGroups.map((g) => g.id) })
  return tabs
}

/** Lucky28 sidebar — เลขพิเศษ | ผลรวม | ลูกที่ 1–3 */
export function buildLucky28SidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  const nav = buildLucky28Nav(betGroups)
  const tabs: SidebarTab[] = []
  if (nav.integrate) {
    tabs.push({
      id: 'integrate',
      label: LUCKY28_MAIN_TABS.integrate,
      groupIds: [nav.integrate.id],
    })
  }
  if (nav.sum) {
    tabs.push({ id: 'sum', label: LUCKY28_MAIN_TABS.sum, groupIds: [nav.sum.id] })
  }
  const ballIds = nav.ballGroups.map((g) => g.id)
  if (ballIds.length) {
    tabs.push({ id: 'balls', label: LUCKY28_MAIN_TABS.balls, groupIds: ballIds })
  }
  return tabs
}

/** th6688 SSC — 两面 | 1-5球 */
export function buildSscSidebarTabs(betGroups: BetGroup[]): SidebarTab[] {
  const tabs: SidebarTab[] = []
  if (
    betGroups.some(
      (g) => g.id === 'sum' || ['ball1', 'b2', 'b3', 'b4', 'b5'].includes(g.id),
    )
  ) {
    tabs.push({
      id: 'twoSide',
      label: SSC_MAIN_TABS.twoSide,
      groupIds: ['sum', 'ball1', 'b2', 'b3', 'b4', 'b5'].filter((id) =>
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
