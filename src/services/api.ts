import { resolveGameImage } from '@/constants/assets'
import { clearStoredInviteCode, getStoredInviteCode } from '@/lib/inviteCode'
import {
  fetchUserFromSession,
  requireSupabase,
  usernameToEmail,
} from '@/lib/supabase'
import { mapAccountBlockedError } from '@/lib/memberBlock'
import type {
  ActivityCategory,
  GameItem,
  HomeData,
  LotteryItem,
  Promotion,
  SiteMessage,
  User,
  VipTier,
} from '@/types'

export async function fetchHomeData(): Promise<HomeData> {
  const client = requireSupabase()

  const [bannersRes, lotteries, settingsRes, winnersRes] = await Promise.all([
    client.from('site_banners').select('id, image, url').eq('status', 1).order('sort'),
    fetchLotteries(),
    client.from('site_settings').select('notice').eq('id', 1).maybeSingle(),
    client
      .from('winning_feed')
      .select('id, games_name, username, win_amount')
      .order('createtime', { ascending: false })
      .limit(10),
  ])

  if (bannersRes.error) throw new Error(bannersRes.error.message)

  return {
    carousel: (bannersRes.data ?? []).map((b) => ({
      id: b.id,
      image: b.image,
      url: b.url ?? undefined,
    })),
    lotteries,
    notice: settingsRes.data?.notice ?? undefined,
    winners: (winnersRes.data ?? []).map((w) => ({
      id: w.id,
      gamesName: w.games_name ?? '',
      username: w.username ?? '',
      winAmount: Number(w.win_amount),
    })),
  }
}

function mapGameRow(row: {
  id: number
  code: string
  name: string
  image: string | null
  description?: string | null
  is_hot?: boolean
  category_id?: number | null
  status?: number | null
}): LotteryItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    image: resolveGameImage(row.code, row.image ?? undefined),
    description: row.description ?? undefined,
    isHot: row.is_hot ?? false,
    categoryId: row.category_id ?? undefined,
    status: row.status ?? 1,
  }
}

const LOTTERIES_CACHE_TTL_MS = 60_000
let lotteriesCache: { data: LotteryItem[]; at: number } | null = null
let lotteriesInflight: Promise<LotteryItem[]> | null = null

export function invalidateLotteriesCache(): void {
  lotteriesCache = null
}

export async function fetchLotteries(force = false): Promise<LotteryItem[]> {
  const now = Date.now()
  if (!force && lotteriesCache && now - lotteriesCache.at < LOTTERIES_CACHE_TTL_MS) {
    return lotteriesCache.data
  }
  if (lotteriesInflight) return lotteriesInflight

  lotteriesInflight = (async () => {
    const client = requireSupabase()
    const { data, error } = await client
      .from('games')
      .select('id, code, name, image, description, is_hot, category_id, status')
      .eq('status', 1)
      .order('sort')

    if (error) throw new Error(error.message)
    const mapped = (data ?? []).map(mapGameRow)
    lotteriesCache = { data: mapped, at: Date.now() }
    return mapped
  })().finally(() => {
    lotteriesInflight = null
  })

  return lotteriesInflight
}

export async function fetchLotteryByCode(code: string): Promise<LotteryItem | undefined> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('games')
    .select('id, code, name, image, description, is_hot, category_id, status')
    .eq('code', code)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapGameRow(data) : undefined
}

export async function fetchGames(): Promise<GameItem[]> {
  const lotteries = await fetchLotteries()
  return lotteries.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    image: l.image,
    category: 'lottery',
  }))
}

export async function fetchPromotions(categoryId: ActivityCategory = 68): Promise<Promotion[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('activities')
    .select('id, title, text, images, category_id')
    .eq('category_id', categoryId)
    .eq('status', 1)
    .order('sort')

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    text: row.text ?? '',
    images: row.images ?? '',
    categoryId: row.category_id as ActivityCategory,
  }))
}

export async function fetchVipTiers(): Promise<VipTier[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('vip_tiers')
    .select('level, image, deposit_required')
    .order('sort')

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    level: row.level,
    image: row.image ?? '',
    depositRequired: Number(row.deposit_required),
  }))
}

export async function fetchSiteMessages(): Promise<SiteMessage[]> {
  const client = requireSupabase()
  const userId = await import('@/lib/supabase').then((m) => m.getAuthDbUserId())

  let query = client
    .from('user_notices')
    .select('id, title, content, createtime, scope, user_id')
    .order('createtime', { ascending: false })

  if (userId) {
    query = query.or(`scope.eq.broadcast,user_id.eq.${userId}`)
  } else {
    query = query.eq('scope', 'broadcast')
  }

  const { data: notices, error } = await query

  if (error) throw new Error(error.message)

  let readIds = new Set<number>()
  if (userId) {
    const { data: reads } = await client
      .from('user_notice_reads')
      .select('notice_id')
      .eq('user_id', userId)
    readIds = new Set((reads ?? []).map((r) => r.notice_id))
  }

  return (notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    createtime: n.createtime,
    read: readIds.has(n.id),
  }))
}

export async function fetchSiteMessageById(id: number): Promise<SiteMessage | undefined> {
  const messages = await fetchSiteMessages()
  return messages.find((m) => m.id === id)
}

export async function markSiteMessageRead(id: number): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('mark_notice_read', { p_notice_id: id })
  if (error) throw new Error(error.message)
}

const NOTICE_CACHE_TTL_MS = 60_000
let noticeCache: { text: string; at: number } | null = null

export async function fetchSiteNotice(force = false): Promise<string> {
  const now = Date.now()
  if (!force && noticeCache && now - noticeCache.at < NOTICE_CACHE_TTL_MS) {
    return noticeCache.text
  }

  const client = requireSupabase()
  const { data, error } = await client.from('site_settings').select('notice').eq('id', 1).single()

  if (error) throw new Error(error.message)
  const text = data.notice ?? ''
  noticeCache = { text, at: now }
  return text
}

export async function login(username: string, password: string): Promise<User> {
  const client = requireSupabase()
  const email = usernameToEmail(username)

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(
      error.message.includes('Invalid login')
        ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        : error.message,
    )
  }
  if (!data.session) throw new Error('เข้าสู่ระบบไม่สำเร็จ')

  return fetchUserFromSession(data.session)
}

export async function register(
  username: string,
  password: string,
  phone?: string,
): Promise<User> {
  if (!username.trim() || password.length < 6 || password.length > 20) {
    throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน (รหัสผ่าน 6-20 ตัวอักษร)')
  }

  const client = requireSupabase()
  const email = usernameToEmail(username)
  const inviteCode = getStoredInviteCode()

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.trim(),
        nickname: username.trim(),
        phone: phone?.trim() ?? '',
        invite_code: inviteCode ?? '',
      },
    },
  })

  if (error) throw new Error(error.message)
  if (!data.session) {
    throw new Error(
      'สมัครสำเร็จ — กรุณาปิด Confirm email ใน Supabase Dashboard แล้วลองเข้าสู่ระบบ',
    )
  }

  clearStoredInviteCode()

  if (phone?.trim()) {
    await client.from('users').update({ phone: phone.trim() }).eq('auth_user_id', data.session.user.id)
  }

  return fetchUserFromSession(data.session)
}

export async function logoutAuth(): Promise<void> {
  const client = requireSupabase()
  await client.auth.signOut()
}

export async function changeLoginPassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว')

  const client = requireSupabase()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user?.email) throw new Error('กรุณาเข้าสู่ระบบ')

  const { error: verifyError } = await client.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  })
  if (verifyError) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง')

  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

export async function updateUserProfile(
  patch: Partial<Pick<User, 'nickname' | 'avatar'>>,
): Promise<void> {
  const client = requireSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) throw new Error('กรุณาเข้าสู่ระบบ')

  const { error } = await client.rpc('member_update_profile', {
    p_nickname: patch.nickname ?? null,
    p_avatar: patch.avatar ?? null,
  })

  if (error) {
    const msg = error.message.includes('Could not find the function')
      ? 'ระบบยังไม่พร้อม — รัน supabase/fix_member_avatar.sql'
      : error.message.includes('invalid nickname')
        ? 'กรุณากรอกชื่อเล่น'
          : error.message.includes('invalid avatar')
          ? 'ลิงก์รูปโปรไฟล์ไม่ถูกต้อง'
          : mapAccountBlockedError(error.message)
    throw new Error(msg)
  }
}

export interface DepositSubmitOptions {
  payerName?: string
  proofImage?: string
  channelId?: string
}

export async function submitDeposit(
  amount: number,
  channel: string,
  options?: DepositSubmitOptions,
): Promise<number> {
  if (amount <= 0) throw new Error('กรุณากรอกจำนวนเงิน')
  const client = requireSupabase()
  const channelType = channel === 'crypto' ? 'crypto' : 'bank'
  const { data, error } = await client.rpc('submit_deposit', {
    p_amount: amount,
    p_channel_type: channelType,
    p_payer_name: options?.payerName ?? null,
    p_proof_image: options?.proofImage ?? null,
    p_channel_id: options?.channelId ? Number(options.channelId) : null,
  })
  if (error) throw new Error(mapAccountBlockedError(error.message))
  return Number(data)
}

export interface WithdrawSubmitOptions {
  type: 'bank' | 'crypto'
  bankName?: string
  bankCard?: string
  bankUsername?: string
}

export async function submitWithdraw(
  amount: number,
  payPassword: string,
  options?: WithdrawSubmitOptions,
): Promise<void> {
  const client = requireSupabase()
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('กรุณาระบุจำนวนเงินที่ถูกต้อง')
  }

  const { error } = await client.rpc('submit_withdraw', {
    p_amount: amount,
    p_pay_password: payPassword,
    p_type: options?.type ?? 'bank',
    p_bank_name: options?.bankName ?? null,
    p_bank_card: options?.bankCard ?? null,
    p_bank_username: options?.bankUsername ?? null,
  })

  if (error) {
    const msg = error.message.includes('invalid pay password')
      ? 'รหัสผ่านถอนไม่ถูกต้อง'
      : error.message.includes('insufficient balance')
        ? 'ยอดเงินไม่เพียงพอ'
        : mapAccountBlockedError(error.message)
    throw new Error(msg)
  }
}

export {
  addBankCard,
  addCryptoWallet,
  getBankCards,
  getDepositOrders,
  getBetRecords,
  getBetRecordsPage,
  getWalletRecordsPage,
  submitIdentity,
  getCryptoDepositInfo,
  getCryptoWallets,
  getProfitSummary,
  getRechargeChannels,
  getTransferBankInfo,
  getWalletRecords,
  getWithdrawConfig,
  hasPayPassword,
  setPayPassword,
} from '@/services/wallet'
