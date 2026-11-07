/** Swallow blocked-account errors on the member UI (no user-facing message). */
export const BLOCKED_ACCOUNT_MESSAGE = ''

export function isAccountBlockedError(message: string): boolean {
  return message.includes('account blocked')
}

export function mapAccountBlockedError(message: string): string {
  if (isAccountBlockedError(message)) return BLOCKED_ACCOUNT_MESSAGE
  return message
}
