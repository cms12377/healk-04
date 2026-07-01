const STORAGE_KEY = 'register_invite_code'

/** Persist agent invite code from URL (?invite= / ?code=) for registration. */
export function captureInviteFromHash(hash = window.location.hash): void {
  const raw = hash.replace(/^#/, '').replace(/^\//, '')
  const q = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : ''
  if (!q) return
  const params = new URLSearchParams(q)
  const code = (params.get('invite') ?? params.get('code') ?? '').trim()
  if (code) sessionStorage.setItem(STORAGE_KEY, code)
}

export function getStoredInviteCode(): string | undefined {
  const code = sessionStorage.getItem(STORAGE_KEY)?.trim()
  return code || undefined
}

export function clearStoredInviteCode(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function registerUrlWithInvite(inviteCode: string): string {
  return `#/register?invite=${encodeURIComponent(inviteCode)}`
}
