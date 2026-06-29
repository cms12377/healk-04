import { requireSupabase } from '@/lib/supabase'
import { formatTimestamp } from '@/services/wallet'
import type {
  AdminBetRecord,
  AdminDepositOrder,
  AdminListResult,
  AdminMember,
  AdminOrderStatus,
  AdminWithdrawOrder,
} from '@/types'

function mapDeposit(row: Record<string, unknown>): AdminDepositOrder {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username ?? ''),
    amount: Number(row.amount),
    status: String(row.status),
    statusText: String(row.status_text ?? ''),
    createtime: Number(row.createtime),
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
  }
}

function mapWithdraw(row: Record<string, unknown>): AdminWithdrawOrder {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username ?? ''),
    amount: Number(row.amount),
    fee: Number(row.fee ?? 0),
    status: String(row.status),
    statusText: String(row.status_text ?? ''),
    createtime: Number(row.createtime),
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
  }
}

function mapBet(row: Record<string, unknown>): AdminBetRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username ?? ''),
    gamesName: String(row.games_name ?? ''),
    drawNumber: String(row.draw_number ?? ''),
    number: String(row.number ?? ''),
    position: row.position ? String(row.position) : undefined,
    amount: Number(row.amount),
    betAmount: Number(row.bet_amount ?? row.amount),
    multiple: Number(row.multiple ?? 1),
    winAmount: Number(row.win_amount ?? 0),
    status: String(row.status),
    statusText: String(row.status_text ?? ''),
    createtime: Number(row.createtime),
  }
}

function mapMember(row: Record<string, unknown>): AdminMember {
  return {
    id: Number(row.id),
    username: String(row.username),
    nickname: String(row.nickname ?? row.username),
    money: Number(row.money),
    createtime: Number(row.createtime),
    jointimeText: String(row.jointime_text ?? formatTimestamp(Number(row.createtime))),
  }
}

async function parseList<T>(
  fetcher: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  mapper: (row: Record<string, unknown>) => T,
): Promise<AdminListResult<T>> {
  const { data, error } = await fetcher()
  if (error) throw new Error(error.message)
  const payload = data as {
    data?: Record<string, unknown>[]
    total?: number
    page?: number
    limit?: number
  }
  return {
    data: (payload.data ?? []).map(mapper),
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? 1),
    limit: Number(payload.limit ?? 10),
  }
}

export async function adminListDeposits(
  status: AdminOrderStatus,
  page: number,
  userId?: number,
): Promise<AdminListResult<AdminDepositOrder>> {
  const client = requireSupabase()
  return parseList(
    () =>
      client.rpc('admin_list_deposits', {
        p_status: status,
        p_page: page,
        p_limit: 10,
        p_user_id: userId ?? null,
      }) as PromiseLike<{ data: unknown; error: { message: string } | null }>,
    mapDeposit,
  )
}

export async function adminListWithdraws(
  status: AdminOrderStatus,
  page: number,
  userId?: number,
): Promise<AdminListResult<AdminWithdrawOrder>> {
  const client = requireSupabase()
  return parseList(
    () =>
      client.rpc('admin_list_withdraws', {
        p_status: status,
        p_page: page,
        p_limit: 10,
        p_user_id: userId ?? null,
      }) as PromiseLike<{ data: unknown; error: { message: string } | null }>,
    mapWithdraw,
  )
}

export async function adminListBets(
  status: AdminOrderStatus,
  page: number,
  userId?: number,
): Promise<AdminListResult<AdminBetRecord>> {
  const client = requireSupabase()
  return parseList(
    () =>
      client.rpc('admin_list_bets', {
        p_status: status,
        p_page: page,
        p_limit: 10,
        p_user_id: userId ?? null,
      }) as PromiseLike<{ data: unknown; error: { message: string } | null }>,
    mapBet,
  )
}

export async function adminListMembers(page: number): Promise<AdminListResult<AdminMember>> {
  const client = requireSupabase()
  return parseList(
    () =>
      client.rpc('admin_list_members', {
        p_page: page,
        p_limit: 10,
      }) as PromiseLike<{ data: unknown; error: { message: string } | null }>,
    mapMember,
  )
}

export async function adminReviewDeposit(
  orderId: number,
  action: 'approve' | 'reject',
  note?: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_review_deposit', {
    p_order_id: orderId,
    p_action: action,
    p_note: note ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function adminReviewWithdraw(
  orderId: number,
  action: 'approve' | 'reject',
  note?: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_review_withdraw', {
    p_order_id: orderId,
    p_action: action,
    p_note: note ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function adminManualDeposit(
  userId: number,
  amount: number,
  note?: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_manual_deposit', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note ?? null,
  })
  if (error) throw new Error(error.message)
}

export const ADMIN_STATUS_TABS: { value: AdminOrderStatus; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '0', label: 'รอดำเนินการ' },
  { value: '1', label: 'อนุมัติแล้ว' },
  { value: '2', label: 'ปฏิเสธ' },
]

export const ADMIN_BET_STATUS_TABS: { value: AdminOrderStatus; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '0', label: 'รอออกผล' },
  { value: '1', label: 'แพ้' },
  { value: '2', label: 'ชนะ' },
]
