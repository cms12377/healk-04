import { sanitizeBetContent } from '@/lib/betEvaluation'
import { parseAnalyz, deriveAnalyzFromNumbers, normalizeQuickChips } from '@/lib/drawDisplay'
import { isBettingClosed, secondsUntilDraw, getGameCycleLabel, getGameCycleSeconds } from '@/lib/gameIntervals'
import { normalizeK3BetGroups } from '@/lib/gameNav'
import { syncDueGames } from '@/services/gameSync'
import { getGameType } from '@/services/lotteryUtils'
import { requireSupabase } from '@/lib/supabase'
import type { BetOption, DrawRecord, LotteryItem } from '@/types'

export interface BetGroup {
  id: string
  name: string
  options: BetOption[]
  categories?: BetCategory[]
}

export interface BetCategory {
  id: string
  name: string
  options: BetOption[]
}

export interface CurrentIssue {
  issue: string
  drawTime: number
  /** Raw draw_time from DB (Unix seconds) */
  rawDrawTime: number
  status: number
  quickAmounts: string[]
  secondsLeft: number
  closed: boolean
  cycleSeconds: number
  cycleLabel: string
  isOverdue: boolean
}

export interface LobbyCategory {
  id: string
  name: string
  codes: string[]
}

const LM_CATEGORY_ORDER = [
  '冠军', '亚军', '第三名', '第四名', '第五名',
  '第六名', '第七名', '第八名', '第九名', '第十名',
] as const

const GY_CATEGORY_ORDER = ['冠亚军和', '冠亚军和-大小单双'] as const

const MARKSIX_CATEGORY_ORDER = ['特码', '正码', '两面', '波色'] as const

const SIDE_SUFFIX_ORDER = ['big', 'small', 'odd', 'even', 'dragon', 'tiger'] as const

function sideBetSortKey(betContent: string): number {
  for (let i = 0; i < SIDE_SUFFIX_ORDER.length; i++) {
    const suffix = SIDE_SUFFIX_ORDER[i]
    if (
      betContent.endsWith(`_${suffix}`) ||
      betContent === `gy_${suffix}` ||
      betContent === `gyj_${suffix}`
    ) {
      return i
    }
  }
  return 99
}

function sortCategoryOptions(categoryName: string, options: BetOption[]): BetOption[] {
  if (categoryName === '两面') {
    const order = ['big', 'small', 'odd', 'even', 'red', 'blue', 'green']
    return [...options].sort(
      (a, b) =>
        order.indexOf(a.betContent ?? '') - order.indexOf(b.betContent ?? ''),
    )
  }
  if (categoryName === '冠亚军和' || categoryName === '特码' || categoryName === '正码') {
    return [...options].sort((a, b) => {
      const na = Number((a.betContent ?? '').replace(/^t[mn]_/, '') || a.label)
      const nb = Number((b.betContent ?? '').replace(/^t[mn]_/, '') || b.label)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return sideBetSortKey(a.betContent ?? '') - sideBetSortKey(b.betContent ?? '')
    })
  }
  if (LM_CATEGORY_ORDER.includes(categoryName as (typeof LM_CATEGORY_ORDER)[number])) {
    return [...options].sort((a, b) => {
      const na = Number(a.label)
      const nb = Number(b.label)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return sideBetSortKey(a.betContent ?? '') - sideBetSortKey(b.betContent ?? '')
    })
  }
  return [...options].sort(
    (a, b) => sideBetSortKey(a.betContent ?? '') - sideBetSortKey(b.betContent ?? ''),
  )
}

function sortCategories(categories: BetCategory[]): BetCategory[] {
  const rank = (name: string): number => {
    const gy = GY_CATEGORY_ORDER.indexOf(name as (typeof GY_CATEGORY_ORDER)[number])
    if (gy >= 0) return gy
    const ms = MARKSIX_CATEGORY_ORDER.indexOf(name as (typeof MARKSIX_CATEGORY_ORDER)[number])
    if (ms >= 0) return ms
    const lm = LM_CATEGORY_ORDER.indexOf(name as (typeof LM_CATEGORY_ORDER)[number])
    if (lm >= 0) return 20 + lm
    return 100
  }
  return [...categories]
    .sort((a, b) => rank(a.name) - rank(b.name))
    .map((c) => ({ ...c, options: sortCategoryOptions(c.name, c.options) }))
}

function parseResultNumbers(result: string): string[] {
  return result.split(/[,，\s]+/).filter(Boolean)
}
function formatDrawTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString('th-TH')
}

export async function fetchDrawHistory(gamesId: number, limit = 20): Promise<DrawRecord[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('draw_results')
    .select('id, issue, result, analyz_result, createtime')
    .eq('games_id', gamesId)
    .order('createtime', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const { data: gameRow } = await client.from('games').select('code').eq('id', gamesId).maybeSingle()
  const gameType = getGameType(gameRow?.code ?? '')

  return (data ?? []).map((row) => {
    const numbers = parseResultNumbers(row.result)
    const parsed = parseAnalyz(row.analyz_result)
    const derived = deriveAnalyzFromNumbers(gameType, numbers)
    return {
      id: row.id,
      issue: row.issue,
      numbers,
      drawTime: formatDrawTime(row.createtime),
      analyz: {
        ...derived,
        ...parsed,
        dxList: parsed.dxList ?? derived.dxList,
        dsList: parsed.dsList ?? derived.dsList,
      },
    }
  })
}

export async function fetchCurrentIssue(
  gamesId: number,
  gameCode?: string,
): Promise<CurrentIssue | null> {
  const client = requireSupabase()

  let code = gameCode
  if (!code) {
    const { data: gameRow } = await client.from('games').select('code').eq('id', gamesId).maybeSingle()
    code = gameRow?.code ?? ''
  }

  const loadRow = async () => {
    const { data, error } = await client
      .from('game_issues')
      .select('issue, draw_time, status, bet_quick_amount')
      .eq('games_id', gamesId)
      .eq('status', 0)
      .order('draw_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  let data = await loadRow()
  if (!data) return null

  let rawDrawTime = Number(data.draw_time)
  let now = Math.floor(Date.now() / 1000)

  if (rawDrawTime <= now) {
    await syncDueGames().catch(() => null)
    data = await loadRow()
    if (!data) return null
    rawDrawTime = Number(data.draw_time)
    now = Math.floor(Date.now() / 1000)
    if (rawDrawTime <= now) {
      await advanceGameRound(gamesId).catch(() => null)
      data = await loadRow()
      if (!data) return null
      rawDrawTime = Number(data.draw_time)
      now = Math.floor(Date.now() / 1000)
    }
  }

  const secondsLeft = secondsUntilDraw(rawDrawTime, code, now)
  const cycleSeconds = getGameCycleSeconds(code || 'df_pk10')

  return {
    issue: data.issue,
    drawTime: rawDrawTime,
    rawDrawTime,
    status: data.status,
    quickAmounts: normalizeQuickChips(data.bet_quick_amount as string[]).map(String),
    secondsLeft,
    closed: isBettingClosed(rawDrawTime, code || 'df_pk10', now),
    cycleSeconds,
    cycleLabel: getGameCycleLabel(code || 'df_pk10'),
    isOverdue: rawDrawTime <= now,
  }
}

export async function fetchBetGroups(gamesId: number): Promise<BetGroup[]> {
  const client = requireSupabase()

  const [groupsRes, itemsRes, catsRes, gameRes] = await Promise.all([
    client.from('play_groups').select('id, code, name').eq('games_id', gamesId).order('sort'),
    client
      .from('play_items')
      .select('id, group_id, category_id, bet_content, label, odds')
      .eq('games_id', gamesId)
      .eq('status', 1),
    client.from('play_categories').select('id, name').eq('games_id', gamesId),
    client.from('games').select('code').eq('id', gamesId).maybeSingle(),
  ])

  if (groupsRes.error) throw new Error(groupsRes.error.message)
  if (itemsRes.error) throw new Error(itemsRes.error.message)
  if (catsRes.error) throw new Error(catsRes.error.message)
  if (gameRes.error) throw new Error(gameRes.error.message)

  const groups = groupsRes.data ?? []
  const gameCode = gameRes.data?.code ?? ''
  const items = itemsRes.data ?? []
  const catMap = new Map((catsRes.data ?? []).map((c) => [c.id, c.name]))

  if (groups.length === 0) return []

  const mapItem = (item: (typeof items)[0]): BetOption => ({
    id: String(item.id),
    label: item.label ?? item.bet_content,
    odds: Number(item.odds),
    betContent: item.bet_content,
    playItemId: item.id,
  })

  const mapped = groups.map((g) => {
    const groupItems = items.filter((item) => item.group_id === g.id)
    const withCat = groupItems.filter((item) => item.category_id != null)

    if (withCat.length > 0) {
      const catIds = [...new Set(withCat.map((i) => i.category_id!))]
      const categories: BetCategory[] = sortCategories(
        catIds.map((catId) => ({
          id: String(catId),
          name: catMap.get(catId) ?? '—',
          options: withCat.filter((i) => i.category_id === catId).map(mapItem),
        })),
      )
      const uncategorized = groupItems.filter((i) => i.category_id == null).map(mapItem)
      return {
        id: g.code ?? String(g.id),
        name: g.name,
        options: uncategorized,
        categories,
      }
    }

    return {
      id: g.code ?? String(g.id),
      name: g.name,
      options: groupItems.map(mapItem),
    }
  }).filter((g) => g.options.length > 0 || (g.categories?.length ?? 0) > 0)

  if (gameCode === 'df_k3') {
    return normalizeK3BetGroups(mapped)
  }

  return mapped
}

export async function fetchLobbyCategories(): Promise<LobbyCategory[]> {
  const client = requireSupabase()

  const [catsRes, gamesRes] = await Promise.all([
    client.from('game_categories').select('id, name').order('sort'),
    client.from('games').select('code, category_id').eq('status', 1).order('sort'),
  ])

  if (catsRes.error) throw new Error(catsRes.error.message)
  if (gamesRes.error) throw new Error(gamesRes.error.message)

  return (catsRes.data ?? []).map((cat) => ({
    id: String(cat.id),
    name: cat.name,
    codes: (gamesRes.data ?? [])
      .filter((g) => g.category_id === cat.id)
      .map((g) => g.code),
  }))
}

export interface BetSubmitItem {
  amount: number
  betContent: string
  label: string
  groupName: string
  categoryName?: string
  odds: number
  playItemId?: number
}

export async function advanceGameRound(gamesId: number): Promise<{
  skipped: boolean
  reason?: string
  newIssue?: string
  result?: string
  settled?: number
} | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('advance_game_round', { p_games_id: gamesId })
  if (error) {
    if (error.message.includes('Could not find')) return null
    throw new Error(error.message)
  }
  const row = data as Record<string, unknown> | null
  if (!row) return null
  return {
    skipped: Boolean(row.skipped),
    reason: row.reason ? String(row.reason) : undefined,
    newIssue: row.new_issue as string | undefined,
    result: row.result as string | undefined,
    settled: row.settled as number | undefined,
  }
}

export async function submitBets(
  gamesId: number,
  issue: string,
  bets: BetSubmitItem[],
): Promise<void> {
  const client = requireSupabase()
  const payload = bets.map((b) => ({
    amount: b.amount,
    bet_content: sanitizeBetContent(b.betContent),
    label: b.label,
    group_name: b.groupName,
    category_name: b.categoryName ?? b.groupName,
    odds: b.odds,
    play_item_id: b.playItemId ?? null,
  }))

  const { error } = await client.rpc('submit_bets', {
    p_games_id: gamesId,
    p_issue: issue,
    p_bets: payload,
  })

  if (error) {
    const msg = error.message.includes('insufficient balance')
      ? 'ยอดเงินไม่เพียงพอ'
      : error.message
    throw new Error(msg)
  }
}

export function filterLobbyGames(lotteries: LotteryItem[], categoryId: string): LotteryItem[] {
  const catId = Number(categoryId)
  if (Number.isNaN(catId)) return lotteries
  return lotteries.filter((l) => l.categoryId === catId)
}

export function filterHotGames(lotteries: LotteryItem[]): LotteryItem[] {
  return lotteries.filter((l) => l.isHot)
}
