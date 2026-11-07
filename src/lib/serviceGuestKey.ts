const STORAGE_KEY = 'service_guest_key'

export function getOrCreateGuestKey(): string {
  let key = localStorage.getItem(STORAGE_KEY)
  if (!key) {
    key =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : `g${Date.now()}${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(STORAGE_KEY, key)
  }
  return key
}
