import { createClient, type Session } from '@supabase/supabase-js'
import type { User } from '@/types'

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
    .select('id, username, nickname, avatar, money, is_paypwd')
    .eq('auth_user_id', session.user.id)
    .single()

  if (error || !data) {
    throw new Error('ไม่พบข้อมูลผู้ใช้ — ลองสมัครสมาชิกใหม่หรือรัน supabase/auth_setup.sql')
  }

  return {
    id: data.id,
    username: data.username,
    nickname: data.nickname ?? data.username,
    avatar: data.avatar ?? '/assets/logo.jpg',
    balance: Number(data.money),
    token: session.access_token,
    hasPayPassword: data.is_paypwd,
  }
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
