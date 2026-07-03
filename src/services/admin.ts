import { resolveGameCountdown } from '@/lib/gameIntervals'
import { requireSupabase } from '@/lib/supabase'
import { syncDueGames } from '@/services/gameSync'
import { mapServiceChatMessage, type SendServiceChatInput } from '@/services/serviceChat'
import { formatTimestamp } from '@/services/wallet'
import type {
  AdminActivity,
  AdminAdvanceResult,
  AdminBetRecord,
  AdminDepositOrder,
  AdminGameInfo,
  AdminIdentityRequest,
  AdminListResult,
  AdminMember,
  AdminMemberPaymentInfo,
  AdminOrderStatus,
  AdminRechargeChannel,
  AdminServiceConversation,
  AdminSiteSettings,
  AdminUserNotice,
  AdminVipTierRow,
  AdminWithdrawOrder,
  ActivityCategory,
  ServiceChatMessage,
} from '@/types'

function mapDeposit(row: Record<string, unknown>): AdminDepositOrder {
  const channelType = row.channel_type ? String(row.channel_type) : undefined
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username ?? ''),
    amount: Number(row.amount),
    status: String(row.status),
    statusText: String(row.status_text ?? ''),
    createtime: Number(row.createtime),
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
    channelType:
      channelType === 'bank' || channelType === 'crypto' ? channelType : undefined,
    channelName: row.channel_name ? String(row.channel_name) : undefined,
    payerName: row.payer_name ? String(row.payer_name) : undefined,
    proofImage: row.proof_image ? String(row.proof_image) : undefined,
  }
}

function mapWithdraw(row: Record<string, unknown>): AdminWithdrawOrder {
  const withdrawType = row.withdraw_type ? String(row.withdraw_type) : undefined
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
    withdrawType:
      withdrawType === 'bank' || withdrawType === 'crypto' ? withdrawType : undefined,
    bankName: row.bank_name ? String(row.bank_name) : undefined,
    bankCard: row.bank_card ? String(row.bank_card) : undefined,
    bankUsername: row.bank_username ? String(row.bank_username) : undefined,
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
    isWin: (row.is_win === '1' ? '1' : '0') as '0' | '1',
    createtime: Number(row.createtime),
  }
}

function mapMember(row: Record<string, unknown>): AdminMember {
  return {
    id: Number(row.id),
    username: String(row.username),
    nickname: String(row.nickname ?? row.username),
    phone: row.phone ? String(row.phone) : undefined,
    money: Number(row.money),
    status: Number(row.status ?? 1),
    createtime: Number(row.createtime),
    jointimeText: String(row.jointime_text ?? formatTimestamp(Number(row.createtime))),
    realName: row.real_name ? String(row.real_name) : undefined,
    identityStatus: row.identity_status ? String(row.identity_status) : undefined,
    invitedBy: row.invited_by != null ? Number(row.invited_by) : undefined,
    hasPayPassword: Boolean(row.is_paypwd),
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

export async function adminGetMember(userId: number): Promise<AdminMember> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_get_member', { p_user_id: userId })
  if (error) throw new Error(error.message)
  return mapMember(data as Record<string, unknown>)
}

export async function adminUpdateMember(
  userId: number,
  input: {
    nickname?: string
    phone?: string
    realName?: string
    money?: number
  },
): Promise<AdminMember> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_update_member', {
    p_user_id: userId,
    p_nickname: input.nickname ?? null,
    p_phone: input.phone ?? null,
    p_real_name: input.realName ?? null,
    p_money: input.money ?? null,
  })
  if (error) throw new Error(error.message)
  return mapMember(data as Record<string, unknown>)
}

export async function adminSetMemberStatus(userId: number, status: 0 | 1): Promise<AdminMember> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_set_member_status', {
    p_user_id: userId,
    p_status: status,
  })
  if (error) {
    const msg = error.message.includes('Could not find the function')
      ? 'ระบบยังไม่พร้อม — รัน supabase/fix_admin_member_crud.sql ใน Supabase SQL Editor'
      : error.message
    throw new Error(msg)
  }
  return mapMember(data as Record<string, unknown>)
}

export async function adminSetMemberPayPassword(
  userId: number,
  password: string,
): Promise<AdminMember> {
  if (!/^\d{6}$/.test(password)) {
    throw new Error('รหัสผ่านถอนต้องเป็นตัวเลข 6 หลัก')
  }
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_set_member_pay_password', {
    p_user_id: userId,
    p_password: password,
  })
  if (error) {
    const msg = error.message.includes('invalid pay password format')
      ? 'รหัสผ่านถอนต้องเป็นตัวเลข 6 หลัก'
      : error.message
    throw new Error(msg)
  }
  return mapMember(data as Record<string, unknown>)
}

export async function adminDeleteMember(userId: number): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_delete_member', { p_user_id: userId })
  if (error) {
    const msg = error.message.includes('Could not find the function')
      ? 'ระบบยังไม่พร้อม — รัน supabase/fix_admin_member_crud.sql ใน Supabase SQL Editor'
      : error.message
    throw new Error(msg)
  }
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

export async function adminFetchAllMembers(): Promise<AdminMember[]> {
  const all: AdminMember[] = []
  let page = 1
  while (true) {
    const res = await adminListMembers(page)
    all.push(...res.data)
    if (res.data.length < res.limit) break
    page += 1
  }
  return all
}

export async function adminFindMemberById(id: number): Promise<AdminMember | null> {
  let page = 1
  while (true) {
    const res = await adminListMembers(page)
    const found = res.data.find((m) => m.id === id)
    if (found) return found
    if (res.data.length < res.limit) return null
    page += 1
  }
}

function mapIdentity(row: Record<string, unknown>): AdminIdentityRequest {
  return {
    userId: Number(row.user_id),
    username: String(row.username),
    nickname: String(row.nickname ?? row.username),
    realName: String(row.real_name ?? ''),
    idNumber: String(row.id_number ?? ''),
    identityFrontUrl: row.identity_front_url ? String(row.identity_front_url) : undefined,
    identityBackUrl: row.identity_back_url ? String(row.identity_back_url) : undefined,
    identityStatus: String(row.identity_status ?? 'pending'),
    createtime: Number(row.createtime),
    jointimeText: String(row.jointime_text ?? formatTimestamp(Number(row.createtime))),
  }
}

export async function adminListIdentity(
  page: number,
): Promise<AdminListResult<AdminIdentityRequest>> {
  const client = requireSupabase()
  return parseList(
    () =>
      client.rpc('admin_list_identity', {
        p_page: page,
        p_limit: 10,
      }) as PromiseLike<{ data: unknown; error: { message: string } | null }>,
    mapIdentity,
  )
}

export async function adminReviewIdentity(
  userId: number,
  action: 'approve' | 'reject',
  note?: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_review_identity', {
    p_user_id: userId,
    p_action: action,
    p_note: note ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function adminGetMemberPayment(userId: number): Promise<AdminMemberPaymentInfo> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_get_member_payment', {
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  const user = row.user as Record<string, unknown>
  const banks = (row.bank_cards as Record<string, unknown>[]) ?? []
  const wallets = (row.crypto_wallets as Record<string, unknown>[]) ?? []
  return {
    user: {
      id: Number(user.id),
      username: String(user.username),
      nickname: String(user.nickname ?? user.username),
      realName: user.real_name ? String(user.real_name) : undefined,
      idNumber: user.id_number ? String(user.id_number) : undefined,
      identityStatus: String(user.identity_status ?? 'none'),
      money: Number(user.money),
    },
    bankCards: banks.map((b) => ({
      id: Number(b.id),
      bankName: String(b.bank_name),
      bankUsername: String(b.bank_username),
      bankCard: String(b.bank_card),
      isDefault: Boolean(b.is_default),
      createtime: Number(b.createtime),
    })),
    cryptoWallets: wallets.map((w) => ({
      id: Number(w.id),
      address: String(w.address),
      remark: w.remark ? String(w.remark) : undefined,
      isDefault: Boolean(w.is_default),
      createtime: Number(w.createtime),
    })),
  }
}

export interface AdminPendingStats {
  pendingDeposits: number
  pendingWithdraws: number
  pendingIdentity: number
}

export async function adminFetchPendingStats(): Promise<AdminPendingStats> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_pending_stats')
  if (!error && data) {
    const row = data as Record<string, unknown>
    return {
      pendingDeposits: Number(row.pending_deposits ?? 0),
      pendingWithdraws: Number(row.pending_withdraws ?? 0),
      pendingIdentity: Number(row.pending_identity ?? 0),
    }
  }

  const [deposits, withdraws] = await Promise.all([
    adminListDeposits('0', 1),
    adminListWithdraws('0', 1),
  ])
  return {
    pendingDeposits: deposits.total,
    pendingWithdraws: withdraws.total,
    pendingIdentity: 0,
  }
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

function mapGame(row: Record<string, unknown>): AdminGameInfo {
  const drawMode = String(row.draw_mode ?? 'random')
  const code = String(row.code ?? '')
  const drawTime = row.draw_time != null ? Number(row.draw_time) : undefined
  const countdown = resolveGameCountdown(drawTime, code)
  return {
    id: Number(row.id),
    code,
    name: String(row.name ?? ''),
    gameType: String(row.game_type ?? ''),
    status: Number(row.status ?? 0),
    sort: Number(row.sort ?? 0),
    drawMode: drawMode === 'manual' ? 'manual' : 'random',
    nextDrawResult: row.next_draw_result ? String(row.next_draw_result) : undefined,
    cycleSeconds: countdown.cycleSeconds,
    cycleLabel: countdown.cycleLabel,
    isOverdue: countdown.isOverdue,
    issue: row.issue ? String(row.issue) : undefined,
    drawTime,
    secondsLeft: countdown.secondsLeft,
    lastIssue: row.last_issue ? String(row.last_issue) : undefined,
    lastResult: row.last_result ? String(row.last_result) : undefined,
  }
}

function refreshGameCountdowns(games: AdminGameInfo[]): AdminGameInfo[] {
  return games.map((game) => {
    const countdown = resolveGameCountdown(game.drawTime, game.code)
    return {
      ...game,
      secondsLeft: countdown.secondsLeft,
      cycleSeconds: countdown.cycleSeconds,
      cycleLabel: countdown.cycleLabel,
      isOverdue: countdown.isOverdue,
    }
  })
}

export async function adminFetchSettings(): Promise<AdminSiteSettings> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_get_settings')
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    notice: String(row.notice ?? ''),
    serviceUrl: String(row.service_url ?? ''),
    currency: String(row.currency ?? '฿'),
  }
}

export async function adminUpdateSettings(input: {
  notice: string
  currency: string
  serviceUrl?: string
}): Promise<AdminSiteSettings> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_update_settings', {
    p_notice: input.notice,
    p_service_url: input.serviceUrl ?? '',
    p_currency: input.currency,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    notice: String(row.notice ?? ''),
    serviceUrl: String(row.service_url ?? ''),
    currency: String(row.currency ?? '฿'),
  }
}

export async function adminFetchGames(): Promise<AdminGameInfo[]> {
  await syncDueGames().catch(() => null)
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_list_games')
  if (error) throw new Error(error.message)
  const payload = data as { data?: Record<string, unknown>[] }
  return refreshGameCountdowns((payload.data ?? []).map(mapGame))
}

export function adminTickGameCountdowns(games: AdminGameInfo[]): AdminGameInfo[] {
  return refreshGameCountdowns(games)
}

export async function adminSetGameStatus(
  gamesId: number,
  status: 0 | 1,
): Promise<AdminGameInfo[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_set_game_status', {
    p_games_id: gamesId,
    p_status: status,
  })
  if (error) throw new Error(error.message)
  const payload = data as { data?: Record<string, unknown>[] }
  return refreshGameCountdowns((payload.data ?? []).map(mapGame))
}

export async function adminSetDrawMode(
  gamesId: number,
  mode: 'random' | 'manual',
): Promise<AdminGameInfo[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_set_draw_mode', {
    p_games_id: gamesId,
    p_mode: mode,
  })
  if (error) throw new Error(error.message)
  const payload = data as { data?: Record<string, unknown>[] }
  return refreshGameCountdowns((payload.data ?? []).map(mapGame))
}

export async function adminSetNextDrawResult(
  gamesId: number,
  result: string,
): Promise<AdminGameInfo[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_set_next_draw_result', {
    p_games_id: gamesId,
    p_result: result,
  })
  if (error) throw new Error(error.message)
  const payload = data as { data?: Record<string, unknown>[] }
  return refreshGameCountdowns((payload.data ?? []).map(mapGame))
}

export async function adminAdvanceGame(gamesId: number): Promise<AdminAdvanceResult> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_force_advance_game', {
    p_games_id: gamesId,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    skipped: Boolean(row.skipped),
    reason: row.reason ? String(row.reason) : undefined,
    drawnIssue: row.drawn_issue ? String(row.drawn_issue) : undefined,
    result: row.result ? String(row.result) : undefined,
    settled: row.settled != null ? Number(row.settled) : undefined,
    newIssue: row.new_issue ? String(row.new_issue) : undefined,
    drawTime: row.draw_time != null ? Number(row.draw_time) : undefined,
    secondsLeft: row.seconds_left != null ? Number(row.seconds_left) : undefined,
  }
}

function mapRechargeChannel(row: Record<string, unknown>): AdminRechargeChannel {
  const amounts = row.quick_amounts
  return {
    id: Number(row.id),
    type: row.type === 'crypto' ? 'crypto' : 'bank',
    name: String(row.name ?? ''),
    bankName: row.bank_name ? String(row.bank_name) : undefined,
    bankUsername: row.bank_username ? String(row.bank_username) : undefined,
    bankCard: row.bank_card ? String(row.bank_card) : undefined,
    address: row.address ? String(row.address) : undefined,
    qrcode: row.qrcode ? String(row.qrcode) : undefined,
    notice: row.notice ? String(row.notice) : undefined,
    quickAmounts: Array.isArray(amounts)
      ? amounts.map(String)
      : typeof amounts === 'string'
        ? (JSON.parse(amounts) as string[])
        : [],
    status: Number(row.status ?? 1),
    sort: Number(row.sort ?? 0),
  }
}

export async function adminListRechargeChannels(): Promise<AdminRechargeChannel[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_list_recharge_channels')
  if (error) throw new Error(error.message)
  const rows = (data as Record<string, unknown>[]) ?? []
  return rows.map(mapRechargeChannel)
}

export interface AdminSaveRechargeChannelInput {
  id?: number
  type: 'bank' | 'crypto'
  name: string
  bankName?: string
  bankUsername?: string
  bankCard?: string
  address?: string
  qrcode?: string
  notice?: string
  quickAmounts: string[]
  sort: number
  status: 0 | 1
}

export async function adminSaveRechargeChannel(
  input: AdminSaveRechargeChannelInput,
): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_save_recharge_channel', {
    p_id: input.id ?? null,
    p_type: input.type,
    p_name: input.name,
    p_bank_name: input.bankName ?? null,
    p_bank_username: input.bankUsername ?? null,
    p_bank_card: input.bankCard ?? null,
    p_address: input.address ?? null,
    p_qrcode: input.qrcode ?? null,
    p_notice: input.notice ?? null,
    p_quick_amounts: input.quickAmounts,
    p_sort: input.sort,
    p_status: input.status,
  })
  if (error) throw new Error(error.message)
  return Number(data)
}

function mapServiceConversation(row: Record<string, unknown>): AdminServiceConversation {
  return {
    id: Number(row.id),
    userId: row.user_id != null ? Number(row.user_id) : undefined,
    guestKey: row.guest_key ? String(row.guest_key) : undefined,
    status: Number(row.status ?? 0),
    lastMessageAt: Number(row.last_message_at ?? 0),
    lastPreview: row.last_preview ? String(row.last_preview) : undefined,
    unreadStaff: Number(row.unread_staff ?? 0),
    unreadMember: Number(row.unread_member ?? 0),
    username: row.username ? String(row.username) : undefined,
    displayName: String(row.display_name ?? 'ผู้เยี่ยมชม'),
  }
}

export async function adminListServiceChats(
  limit = 50,
  offset = 0,
): Promise<AdminServiceConversation[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_list_service_chats', {
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw new Error(error.message)
  const rows = (data as Record<string, unknown>[]) ?? []
  return rows.map(mapServiceConversation)
}

export async function adminGetServiceChatThread(conversationId: number): Promise<{
  conversation: AdminServiceConversation
  messages: ServiceChatMessage[]
}> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_get_service_chat_thread', {
    p_conversation_id: conversationId,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    conversation: mapServiceConversation(row.conversation as Record<string, unknown>),
    messages: ((row.messages as Record<string, unknown>[]) ?? []).map(mapServiceChatMessage),
  }
}

export async function adminReplyServiceChat(
  conversationId: number,
  input: SendServiceChatInput | string,
): Promise<ServiceChatMessage> {
  const client = requireSupabase()
  const payload = typeof input === 'string' ? { content: input } : input
  const { data, error } = await client.rpc('admin_reply_service_chat', {
    p_conversation_id: conversationId,
    p_content: payload.content ?? '',
    p_msg_type: payload.msgType ?? 'text',
    p_attachment_url: payload.attachmentUrl ?? null,
    p_attachment_name: payload.attachmentName ?? null,
    p_attachment_mime: payload.attachmentMime ?? null,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return mapServiceChatMessage(row)
}

export async function adminRecallServiceChatMessage(messageId: number): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_recall_service_chat_message', {
    p_message_id: messageId,
  })
  if (error) throw new Error(error.message)
}

export async function adminServiceUnreadCount(): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_service_unread_count')
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

function mapActivity(row: Record<string, unknown>): AdminActivity {
  return {
    id: Number(row.id),
    categoryId: Number(row.category_id) as ActivityCategory,
    title: String(row.title ?? ''),
    text: String(row.text ?? ''),
    images: String(row.images ?? ''),
    status: Number(row.status ?? 1),
    sort: Number(row.sort ?? 0),
    createtime: Number(row.createtime ?? 0),
  }
}

function mapVipTierRow(row: Record<string, unknown>): AdminVipTierRow {
  return {
    level: Number(row.level),
    image: String(row.image ?? ''),
    depositRequired: Number(row.deposit_required ?? 0),
    sort: Number(row.sort ?? 0),
  }
}

function mapUserNotice(row: Record<string, unknown>): AdminUserNotice {
  return {
    id: Number(row.id),
    scope: row.scope === 'user' ? 'user' : 'broadcast',
    userId: row.user_id != null ? Number(row.user_id) : undefined,
    username: row.username ? String(row.username) : undefined,
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    createtime: Number(row.createtime ?? 0),
  }
}

export async function adminListActivities(categoryId?: ActivityCategory): Promise<AdminActivity[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_list_activities', {
    p_category_id: categoryId ?? null,
  })
  if (error) throw new Error(error.message)
  return ((data as Record<string, unknown>[]) ?? []).map(mapActivity)
}

export interface AdminSaveActivityInput {
  id?: number
  categoryId: ActivityCategory
  title: string
  text?: string
  images?: string
  sort: number
  status: 0 | 1
}

export async function adminSaveActivity(input: AdminSaveActivityInput): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_save_activity', {
    p_id: input.id ?? null,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_text: input.text ?? null,
    p_images: input.images ?? null,
    p_sort: input.sort,
    p_status: input.status,
  })
  if (error) throw new Error(error.message)
  return Number(data)
}

export async function adminDeleteActivity(id: number): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_delete_activity', { p_id: id })
  if (error) throw new Error(error.message)
}

export async function adminListVipTiers(): Promise<AdminVipTierRow[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_list_vip_tiers')
  if (error) throw new Error(error.message)
  return ((data as Record<string, unknown>[]) ?? []).map(mapVipTierRow)
}

export interface AdminSaveVipTierInput {
  level: number
  image?: string
  depositRequired: number
  sort: number
}

export async function adminSaveVipTier(input: AdminSaveVipTierInput): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_save_vip_tier', {
    p_level: input.level,
    p_image: input.image ?? null,
    p_deposit_required: input.depositRequired,
    p_sort: input.sort,
  })
  if (error) throw new Error(error.message)
  return Number(data)
}

export async function adminDeleteVipTier(level: number): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_delete_vip_tier', { p_level: level })
  if (error) throw new Error(error.message)
}

export async function adminListUserNotices(): Promise<AdminUserNotice[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_list_user_notices')
  if (error) throw new Error(error.message)
  return ((data as Record<string, unknown>[]) ?? []).map(mapUserNotice)
}

export interface AdminSaveUserNoticeInput {
  id?: number
  scope: 'broadcast' | 'user'
  userId?: number
  title: string
  content: string
}

export async function adminSaveUserNotice(input: AdminSaveUserNoticeInput): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('admin_save_user_notice', {
    p_id: input.id ?? null,
    p_scope: input.scope,
    p_user_id: input.userId ?? null,
    p_title: input.title,
    p_content: input.content,
  })
  if (error) throw new Error(error.message)
  return Number(data)
}

export async function adminDeleteUserNotice(id: number): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('admin_delete_user_notice', { p_id: id })
  if (error) throw new Error(error.message)
}

export type { AdminGameInfo }
