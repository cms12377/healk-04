import type {
  BankCard,
  BetRecord,
  CryptoWallet,
  DateRange,
  DateRangeKey,
  MemberDepositOrder,
  ProfitSummary,
  RechargeChannel,
  TransferBankInfo,
  WalletRecord,
  WithdrawConfig,
} from '@/types'
import { getAuthDbUserId, requireSupabase } from '@/lib/supabase'

export function getDateRange(key: DateRangeKey): DateRange {
  const now = new Date()
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const today = fmt(now)

  switch (key) {
    case 'today':
      return { startDate: today, endDate: today }
    case 'yesterday': {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      const s = fmt(d)
      return { startDate: s, endDate: s }
    }
    case 'dayBeforeYesterday': {
      const d = new Date(now)
      d.setDate(d.getDate() - 2)
      const s = fmt(d)
      return { startDate: s, endDate: s }
    }
    default: {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { startDate: fmt(d), endDate: today }
    }
  }
}

function dateToUnixStart(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00`).getTime() / 1000)
}

function dateToUnixEnd(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T23:59:59`).getTime() / 1000)
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export async function getBankCards(): Promise<BankCard[]> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return []

  const { data, error } = await client
    .from('user_bank_cards')
    .select('id, bank_name, bank_username, bank_card')
    .eq('user_id', userId)
    .order('id')

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: String(row.id),
    bankName: row.bank_name,
    bankUsername: row.bank_username,
    bankCard: row.bank_card,
  }))
}

export async function getCryptoWallets(): Promise<CryptoWallet[]> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return []

  const { data, error } = await client
    .from('user_crypto_wallets')
    .select('id, remark, address')
    .eq('user_id', userId)
    .order('id')

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: String(row.id),
    remark: row.remark ?? '',
    address: row.address,
  }))
}

export async function addBankCard(card: Omit<BankCard, 'id'>): Promise<void> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) throw new Error('กรุณาเข้าสู่ระบบ')

  const { error } = await client.from('user_bank_cards').insert({
    user_id: userId,
    bank_name: card.bankName,
    bank_username: card.bankUsername,
    bank_card: card.bankCard,
    createtime: Math.floor(Date.now() / 1000),
  })

  if (error) throw new Error(error.message)
}

export async function addCryptoWallet(wallet: Omit<CryptoWallet, 'id'>): Promise<void> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) throw new Error('กรุณาเข้าสู่ระบบ')

  const { error } = await client.from('user_crypto_wallets').insert({
    user_id: userId,
    remark: wallet.remark,
    address: wallet.address,
    createtime: Math.floor(Date.now() / 1000),
  })

  if (error) throw new Error(error.message)
}

export async function getWalletRecords(
  categoryId: string,
  range: DateRangeKey,
): Promise<WalletRecord[]> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return []

  const { startDate, endDate } = getDateRange(range)
  const startTime = dateToUnixStart(startDate)
  const endTime = dateToUnixEnd(endDate)

  let query = client
    .from('user_money_logs')
    .select('id, category_id, money, type, createtime, money_categories(name)')
    .eq('user_id', userId)
    .gte('createtime', startTime)
    .lte('createtime', endTime)
    .order('createtime', { ascending: false })

  if (categoryId !== 'all') {
    query = query.eq('category_id', Number(categoryId))
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const cat = row.money_categories as { name: string } | { name: string }[] | null
    const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryLabel: row.type ?? catName ?? String(row.category_id),
      money: Number(row.money),
      createtime: row.createtime,
      type: row.type ?? undefined,
    }
  })
}

const PAGE_SIZE = 20

export async function getWalletRecordsPage(
  categoryId: string,
  range: DateRangeKey,
  page: number,
): Promise<{ records: WalletRecord[]; hasMore: boolean }> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return { records: [], hasMore: false }

  const { startDate, endDate } = getDateRange(range)
  const startTime = dateToUnixStart(startDate)
  const endTime = dateToUnixEnd(endDate)
  const from = page * PAGE_SIZE

  let query = client
    .from('user_money_logs')
    .select('id, category_id, money, type, createtime, money_categories(name)')
    .eq('user_id', userId)
    .gte('createtime', startTime)
    .lte('createtime', endTime)
    .order('createtime', { ascending: false })
    .range(from, from + PAGE_SIZE)

  if (categoryId !== 'all') {
    query = query.eq('category_id', Number(categoryId))
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const hasMore = rows.length > PAGE_SIZE
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  const records = slice.map((row) => {
    const cat = row.money_categories as { name: string } | { name: string }[] | null
    const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryLabel: row.type ?? catName ?? String(row.category_id),
      money: Number(row.money),
      createtime: row.createtime,
      type: row.type ?? undefined,
    }
  })

  return { records, hasMore }
}

export async function getBetRecords(status: '0' | '1' | 'all'): Promise<BetRecord[]> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return []

  let query = client
    .from('bet_records')
    .select('*')
    .eq('user_id', userId)
    .order('createtime', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    gamesName: row.games_name ?? '',
    issue: row.issue,
    betContent: row.bet_content,
    categoryName: row.category_name ?? '',
    amount: Number(row.amount),
    winAmount: Number(row.win_amount),
    status: row.status as '0' | '1',
    statusText: row.status === '1' ? 'ออกผลแล้ว' : 'รอผล',
    isWin: row.is_win as '0' | '1',
    isWinText: row.is_win === '1' ? 'ชนะ' : 'ไม่ชนะ',
    createtime: row.createtime,
  }))
}

export async function getBetRecordsPage(
  status: '0' | '1' | 'all',
  page: number,
  filter?: { gamesId?: number; issue?: string },
): Promise<{ records: BetRecord[]; hasMore: boolean }> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return { records: [], hasMore: false }

  const from = page * PAGE_SIZE

  let query = client
    .from('bet_records')
    .select('*')
    .eq('user_id', userId)
    .order('createtime', { ascending: false })
    .range(from, from + PAGE_SIZE)

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (filter?.gamesId != null) {
    query = query.eq('games_id', filter.gamesId)
  }
  if (filter?.issue) {
    query = query.eq('issue', filter.issue)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const hasMore = rows.length > PAGE_SIZE
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  const records = slice.map((row) => ({
    id: row.id,
    gamesName: row.games_name ?? '',
    issue: row.issue,
    betContent: row.bet_content,
    categoryName: row.category_name ?? '',
    amount: Number(row.amount),
    winAmount: Number(row.win_amount),
    status: row.status as '0' | '1',
    statusText: row.status === '1' ? 'ออกผลแล้ว' : 'รอผล',
    isWin: row.is_win as '0' | '1',
    isWinText: row.is_win === '1' ? 'ชนะ' : 'ไม่ชนะ',
    createtime: row.createtime,
  }))

  return { records, hasMore }
}

export async function getProfitSummary(range: DateRangeKey): Promise<ProfitSummary> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) {
    return { countWinAmount: 0, rechargeCount: 0, withdrawCount: 0 }
  }

  const { startDate, endDate } = getDateRange(range)
  const startTime = dateToUnixStart(startDate)
  const endTime = dateToUnixEnd(endDate)

  const { data, error } = await client.rpc('fn_user_profits', {
    p_user_id: userId,
    p_start_time: startTime,
    p_end_time: endTime,
  })

  if (error) throw new Error(error.message)

  const row = Array.isArray(data) ? data[0] : data
  return {
    countWinAmount: Number(row?.count_win_amount ?? 0),
    rechargeCount: Number(row?.recharge_count ?? 0),
    withdrawCount: Number(row?.withdraw_count ?? 0),
  }
}

export async function getRechargeChannels(): Promise<RechargeChannel[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('recharge_channels')
    .select('id, name, type, quick_amounts')
    .eq('status', 1)
    .order('sort')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: row.name,
    type: row.type as 'bank' | 'crypto',
    quickAmounts: (row.quick_amounts as string[]) ?? [],
  }))
}

export async function getCryptoDepositInfo(
  channelId?: string,
): Promise<{ address: string; notice?: string; qrcode?: string }> {
  const client = requireSupabase()
  let query = client
    .from('recharge_channels')
    .select('address, notice, qrcode')
    .eq('type', 'crypto')
    .eq('status', 1)

  if (channelId) {
    query = query.eq('id', Number(channelId))
  } else {
    query = query.order('sort').limit(1)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw new Error(error.message)
  return {
    address: data?.address ?? '',
    notice: data?.notice ?? undefined,
    qrcode: data?.qrcode ?? undefined,
  }
}

export async function getTransferBankInfo(channelId?: string): Promise<TransferBankInfo> {
  const client = requireSupabase()
  let query = client
    .from('recharge_channels')
    .select('bank_name, bank_username, bank_card, notice')
    .eq('type', 'bank')
    .eq('status', 1)

  if (channelId) {
    query = query.eq('id', Number(channelId))
  } else {
    query = query.order('sort').limit(1)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    return {
      bankName: 'ธนาคารกสิกรไทย',
      bankUsername: 'บัญชีรับฝาก',
      bankCard: '123-4-56789-0',
    }
  }

  return {
    bankName: data.bank_name ?? '',
    bankUsername: data.bank_username ?? '',
    bankCard: data.bank_card ?? '',
    notice: data.notice ?? undefined,
  }
}

export async function getWithdrawConfig(): Promise<WithdrawConfig> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('withdraw_settings')
    .select('withdraw_min, withdraw_max, withdraw_fee')
    .eq('id', 1)
    .single()

  if (error) throw new Error(error.message)
  return {
    withdrawMin: Number(data.withdraw_min),
    withdrawMax: Number(data.withdraw_max),
    withdrawFee: Number(data.withdraw_fee),
  }
}

export async function setPayPassword(pwd: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('set_pay_password', { p_password: pwd })
  if (error) throw new Error(error.message)
}

export async function hasPayPassword(): Promise<boolean> {
  const client = requireSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) return false

  const { data, error } = await client
    .from('users')
    .select('is_paypwd')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (error) return false
  return !!data?.is_paypwd
}

export const WALLET_CATEGORY_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '14', label: 'ฝากเงิน' },
  { value: '15', label: 'ถอนเงิน' },
  { value: '20', label: 'เดิมพัน' },
]

export const DATE_RANGE_OPTIONS = [
  { value: 'last7Days' as const, label: '7 วันล่าสุด' },
  { value: 'dayBeforeYesterday' as const, label: 'เมื่อวานซืน' },
  { value: 'yesterday' as const, label: 'เมื่อวาน' },
  { value: 'today' as const, label: 'วันนี้' },
]

export const BET_STATUS_OPTIONS = [
  { value: '0' as const, label: 'รอดำเนินการ' },
  { value: '1' as const, label: 'เสร็จสิ้น' },
]

export const PROFIT_TABS = [
  { value: 'last7Days' as const, label: '7 วันล่าสุด' },
  { value: 'dayBeforeYesterday' as const, label: 'เมื่อวานซืน' },
  { value: 'yesterday' as const, label: 'เมื่อวาน' },
  { value: 'today' as const, label: 'วันนี้' },
]

const DEPOSIT_STATUS_TEXT: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'สำเร็จ',
  rejected: 'ปฏิเสธ',
}

export async function getDepositOrders(): Promise<MemberDepositOrder[]> {
  const client = requireSupabase()
  const userId = await getAuthDbUserId()
  if (!userId) return []

  const { data, error } = await client
    .from('deposit_orders')
    .select('id, amount, channel_type, payer_name, proof_image, status, admin_note, createtime')
    .eq('user_id', userId)
    .order('createtime', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    channelType: row.channel_type,
    payerName: row.payer_name ?? undefined,
    proofImage: row.proof_image ?? undefined,
    status: row.status,
    statusText: DEPOSIT_STATUS_TEXT[row.status] ?? row.status,
    createtime: row.createtime,
    adminNote: row.admin_note ?? undefined,
  }))
}

export async function submitIdentity(
  realName: string,
  idNumber: string,
  frontUrl?: string,
  backUrl?: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('submit_identity', {
    p_real_name: realName,
    p_id_number: idNumber,
    p_front_url: frontUrl ?? null,
    p_back_url: backUrl ?? null,
  })
  if (error) throw new Error(error.message)
}

export const LANG_OPTIONS = [
  { value: 'th', label: 'ไทย', flag: '🇹🇭' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
]

const LANG_KEY = 'appLang'

export function getLanguage(): string {
  return localStorage.getItem(LANG_KEY) ?? 'th'
}

export function setLanguage(lang: string) {
  localStorage.setItem(LANG_KEY, lang)
}
