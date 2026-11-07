import { checkIsStaff } from '@/lib/supabase'
import type { User } from '@/types'

export function isStaffUser(user: User | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'agent'
}

/** After unified login: staff → admin panel, member → member app */
export async function resolvePostLoginDestination(
  user: User | null | undefined,
): Promise<'admin' | 'member'> {
  if (isStaffUser(user)) return 'admin'
  try {
    if (await checkIsStaff()) return 'admin'
  } catch {
    /* ignore */
  }
  return 'member'
}

export function navigateToAdminApp() {
  sessionStorage.removeItem('loginIntent')
  window.location.hash = '#/admin'
}

export function navigateToMemberApp(hash = '#/') {
  sessionStorage.removeItem('loginIntent')
  const next = hash.startsWith('#') ? hash : `#/${hash.replace(/^\//, '')}`
  window.location.hash = next.slice(1) || '/'
}

export function markAdminLoginIntent() {
  sessionStorage.setItem('loginIntent', 'admin')
}

export function consumeAdminLoginIntent(): boolean {
  const intent = sessionStorage.getItem('loginIntent') === 'admin'
  sessionStorage.removeItem('loginIntent')
  return intent
}
