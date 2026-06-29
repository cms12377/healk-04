import { parseAnalyz, deriveAnalyzFromNumbers } from '@/lib/drawDisplay'
import { getGameType } from '@/services/lotteryUtils'
import { requireSupabase } from '@/lib/supabase'
import type { BetOption, DrawRecord, LotteryItem } from '@/types'

export interface BetGroup {
  id: string
  name: string
  options: BetOption[]
}

export interface CurrentIssue {
  issue: string
  drawTime: number
  status: number
  quickAmounts: string[]
  secondsLeft: number
  closed: boolean
}

export interface LobbyCategory {
  id: string
  name: string
  codes: string[]
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

export async function fetchCurrentIssue(gamesId: number): Promise<CurrentIssue | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('game_issues')
    .select('issue, draw_time, status, bet_quick_amount')
    .eq('games_id', gamesId)
    .eq('status', 0)
    .order('draw_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const now = Math.floor(Date.now() / 1000)
  const secondsLeft = Math.max(0, data.draw_time - now)

  return {
    issue: data.issue,
    drawTime: data.draw_time,
    status: data.status,
    quickAmounts: (data.bet_quick_amount as string[]) ?? ['10', '50', '100', '500', '1000'],
    secondsLeft,
    closed: secondsLeft <= 0,
  }
}

export async function fetchBetGroups(gamesId: number): Promise<BetGroup[]> {
  const client = requireSupabase()

  const [groupsRes, itemsRes] = await Promise.all([
    client.from('play_groups').select('id, code, name').eq('games_id', gamesId).order('sort'),
    client
      .from('play_items')
      .select('id, group_id, bet_content, label, odds')
      .eq('games_id', gamesId)
      .eq('status', 1),
  ])

  if (groupsRes.error) throw new Error(groupsRes.error.message)
  if (itemsRes.error) throw new Error(itemsRes.error.message)

  const groups = groupsRes.data ?? []
  const items = itemsRes.data ?? []

  if (groups.length === 0) return []

  return groups.map((g) => ({
    id: g.code ?? String(g.id),
    name: g.name,
    options: items
      .filter((item) => item.group_id === g.id)
      .map((item) => ({
        id: String(item.id),
        label: item.label ?? item.bet_content,
        odds: Number(item.odds),
        betContent: item.bet_content,
        playItemId: item.id,
      })),
  }))
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

export async function submitBets(
  gamesId: number,
  issue: string,
  bets: BetSubmitItem[],
): Promise<void> {
  const client = requireSupabase()
  const payload = bets.map((b) => ({
    amount: b.amount,
    bet_content: b.betContent,
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
