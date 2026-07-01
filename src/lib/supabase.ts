import { createClient, type Session } from '@supabase/supabase-js'
import { ASSETS } from '@/constants/assets'
import type { User, UserRole } from '@/types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : (null as unknown as ReturnType<typeof createClient>)

const AUTH_EMAIL_DOMAIN = 'pklotery.local'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
}

export function emailToUsername(email: string): string {
  return email.split('@')[0] ?? email
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'ยังไม่ได้ตั้งค่า Supabase — กรอก VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local',
    )
  }
  return supabase
}

export async function getAuthDbUserId(): Promise<number | null> {
  const client = requireSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) return null

  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.id ?? null
}

export async function fetchUserFromSession(session: Session): Promise<User> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('users')
    .select('id, username, nickname, avatar, money, is_paypwd, role, status, day_win, unsettled')
    .eq('auth_user_id', session.user.id)
    .single()

  if (error || !data) {
    throw new Error('ไม่พบข้อมูลผู้ใช้ — ลองสมัครสมาชิกใหม่หรือรัน supabase/auth_setup.sql')
  }

  const accountStatus = Number(data.status ?? 1)
  if (accountStatus === 0) {
    throw new Error('บัญชีถูกระงับ — ติดต่อผู้ดูแลระบบ')
  }
  if (accountStatus === -1) {
    throw new Error('บัญชีนี้ถูกปิดแล้ว')
  }

  return {
    id: data.id,
    username: data.username,
    nickname: data.nickname ?? data.username,
    avatar: data.avatar ?? ASSETS.logo,
    balance: Number(data.money),
    dayWin: Number(data.day_win ?? 0),
    unsettled: Number(data.unsettled ?? 0),
    token: session.access_token,
    hasPayPassword: data.is_paypwd,
    role: (data.role as User['role']) ?? 'member',
  }
}

export async function fetchUserRole(): Promise<UserRole> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('fn_current_user_role')
  if (error) throw new Error(error.message)
  return (data as UserRole) ?? 'member'
}

export async function checkIsStaff(): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('fn_is_staff')
  if (error) return false
  return Boolean(data)
}

export async function refreshUserProfile(): Promise<User | null> {
  const client = requireSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) return null
  return fetchUserFromSession(session)
}

export { requireSupabase }
