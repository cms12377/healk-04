import type { AdminPage } from '@/types'

export interface AdminRoute {
  page: AdminPage
  memberId?: number
  memberName?: string
}

/** Legacy agent hash routes (same URL patterns as reference platform, routes locally) */
const AGENT_ROUTE_MAP: Record<string, AdminPage> = {
  rechargeAdmin: 'recharge',
  depositAdmin: 'withdraw',
  bettingHistory: 'bets',
  huiYuan: 'members',
  chongZhi: 'chongzhi',
}

function parseHashQuery(hash: string): URLSearchParams {
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  return new URLSearchParams(q)
}

export function parseAdminHash(hash = window.location.hash): AdminRoute | null {
  const raw = hash.replace(/^#/, '').replace(/^\//, '')
  const path = raw.split('?')[0]
  const params = parseHashQuery(raw)
  const userIdRaw = params.get('user_id') ?? params.get('userId')
  const memberId = userIdRaw ? Number(userIdRaw) : undefined

  const agentPage = AGENT_ROUTE_MAP[path]
  if (agentPage) {
    return { page: agentPage }
  }

  if (path === 'hyChong' && memberId) {
    return { page: 'member-recharge', memberId }
  }
  if (path === 'hyTixian' && memberId) {
    return { page: 'member-withdraw', memberId }
  }
  if (path === 'hyTou' && memberId) {
    return { page: 'member-bets', memberId }
  }

  if (!path.startsWith('admin')) return null

  const parts = path.split('/').filter(Boolean)
  if (parts.length === 1) return { page: 'menu' }

  switch (parts[1]) {
    case 'recharge':
    case 'rechargeAdmin':
      return { page: 'recharge' }
    case 'withdraw':
    case 'depositAdmin':
      return { page: 'withdraw' }
    case 'bets':
    case 'bettingHistory':
      return { page: 'bets' }
    case 'identity':
    case 'identityCard':
      return { page: 'identity' }
    case 'members':
    case 'huiYuan':
      if (parts.length >= 4) {
        const id = Number(parts[2])
        if (Number.isNaN(id)) return { page: 'members' }
        if (parts[3] === 'recharge' || parts[3] === 'hyChong') {
          return { page: 'member-recharge', memberId: id }
        }
        if (parts[3] === 'withdraw' || parts[3] === 'hyTixian') {
          return { page: 'member-withdraw', memberId: id }
        }
        if (parts[3] === 'bets' || parts[3] === 'hyTou') {
          return { page: 'member-bets', memberId: id }
        }
        if (parts[3] === 'payment' || parts[3] === 'bindBank' || parts[3] === 'bindAddress') {
          return { page: 'member-payment', memberId: id }
        }
      }
      return { page: 'members' }
    case 'chongzhi':
    case 'chongZhi':
      return { page: 'chongzhi' }
    case 'deposit-accounts':
    case 'depositAccounts':
      return { page: 'deposit-accounts' }
    case 'settings':
      return { page: 'settings' }
    case 'games':
      return { page: 'games' }
    default:
      return { page: 'menu' }
  }
}

export function adminNavigate(route: AdminRoute, memberName?: string) {
  let path = '#/admin'
  switch (route.page) {
    case 'menu':
      break
    case 'recharge':
      path = '#/admin/recharge'
      break
    case 'withdraw':
      path = '#/admin/withdraw'
      break
    case 'bets':
      path = '#/admin/bets'
      break
    case 'identity':
      path = '#/admin/identity'
      break
    case 'members':
      path = '#/admin/members'
      break
    case 'member-recharge':
      path = `#/admin/members/${route.memberId}/recharge`
      break
    case 'member-withdraw':
      path = `#/admin/members/${route.memberId}/withdraw`
      break
    case 'member-bets':
      path = `#/admin/members/${route.memberId}/bets`
      break
    case 'member-payment':
      path = `#/admin/members/${route.memberId}/payment`
      break
    case 'chongzhi':
      path = '#/admin/chongzhi'
      break
    case 'deposit-accounts':
      path = '#/admin/deposit-accounts'
      break
    case 'settings':
      path = '#/admin/settings'
      break
    case 'games':
      path = '#/admin/games'
      break
  }
  if (memberName && route.memberId) {
    sessionStorage.setItem(`admin_member_${route.memberId}`, memberName)
  }
  window.location.hash = path.slice(1)
}

/** Agent-style deep links (e.g. #/hyChong?user_id=12) — handled locally */
export function adminNavigateAgent(
  agentPath: keyof typeof AGENT_ROUTE_MAP | 'hyChong' | 'hyTixian' | 'hyTou',
  memberId?: number,
  memberName?: string,
) {
  if (memberId && memberName) {
    sessionStorage.setItem(`admin_member_${memberId}`, memberName)
  }
  if (memberId && (agentPath === 'hyChong' || agentPath === 'hyTixian' || agentPath === 'hyTou')) {
    window.location.hash = `#/${agentPath}?user_id=${memberId}`
    return
  }
  window.location.hash = `#/${agentPath}`
}

export function getStoredMemberName(id: number): string | undefined {
  return sessionStorage.getItem(`admin_member_${id}`) ?? undefined
}

export function goMemberApp() {
  window.location.hash = '#/'
}
