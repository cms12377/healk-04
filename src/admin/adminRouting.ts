import type { AdminPage } from '@/types'

export interface AdminRoute {
  page: AdminPage
  memberId?: number
  memberName?: string
  gameId?: number
}

/** Agent panel hash route → local admin page */
const AGENT_ROUTE_MAP: Record<string, AdminPage> = {
  rechargeAdmin: 'recharge',
  depositAdmin: 'withdraw',
  bettingHistory: 'bets',
  huiYuan: 'members',
  chongZhi: 'chongzhi',
}

/** Core agent menu items */
export const AGENT_MENU: {
  page: AdminPage
  legacyHash: string
  title: string
  desc: string
  pendingKey: 'deposits' | 'withdraws' | 'identity' | null
}[] = [
  {
    page: 'recharge',
    legacyHash: 'rechargeAdmin',
    title: 'รายการฝากเงิน',
    desc: 'อนุมัติรายการฝากที่รอดำเนินการ',
    pendingKey: 'deposits',
  },
  {
    page: 'withdraw',
    legacyHash: 'depositAdmin',
    title: 'รายการถอนเงิน',
    desc: 'อนุมัติรายการถอนที่รอดำเนินการ',
    pendingKey: 'withdraws',
  },
  {
    page: 'bets',
    legacyHash: 'bettingHistory',
    title: 'ประวัติเดิมพัน',
    desc: 'ดูเดิมพันทั้งระบบ',
    pendingKey: null,
  },
  {
    page: 'members',
    legacyHash: 'huiYuan',
    title: 'สมาชิก',
    desc: 'จัดการสมาชิกใต้สาย — ฝาก/ถอน/เดิมพันรายคน',
    pendingKey: null,
  },
  {
    page: 'chongzhi',
    legacyHash: 'chongZhi',
    title: 'เติมเงิน',
    desc: 'เติมเงินให้สมาชิกด้วยมือ',
    pendingKey: null,
  },
  {
    page: 'identity',
    legacyHash: 'admin/identity',
    title: 'ยืนยันตัวตน',
    desc: 'อนุมัติคำขอยืนยันตัวตน (KYC)',
    pendingKey: 'identity',
  },
]

/** Legacy hash for each core admin page */
export const AGENT_LEGACY_HASH: Partial<Record<AdminPage, string>> = Object.fromEntries(
  AGENT_MENU.map((item) => [item.page, item.legacyHash]),
)

function parseHashQuery(hash: string): URLSearchParams {
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  return new URLSearchParams(q)
}

export function getHashPath(hash = window.location.hash): string {
  const raw = hash.replace(/^#/, '').replace(/^\//, '')
  return raw.split('?')[0]
}

/** Member self-service hashes that agents also use with ?user_id= for a specific member. */
const MEMBER_SELF_SERVICE_PATHS = new Set(['identityCard', 'bindBank', 'bindAddress'])

function hasAgentMemberContext(hash: string): boolean {
  const params = parseHashQuery(hash.replace(/^#/, '').replace(/^\//, ''))
  return params.has('user_id') || params.has('userId')
}

export function isMemberSelfServiceHash(hash = window.location.hash): boolean {
  const path = getHashPath(hash)
  if (!MEMBER_SELF_SERVICE_PATHS.has(path)) return false
  if (path === 'identityCard') return !hasAgentMemberContext(hash)
  return !hasAgentMemberContext(hash)
}

/** Member KYC / bind-bank share hashes with agent panel — member app unless ?user_id= is set. */
export function shouldUseAdminApp(
  hash = window.location.hash,
  isStaff: boolean,
): boolean {
  if (isMemberSelfServiceHash(hash)) return false

  const parsed = parseAdminHash(hash)
  if (!parsed) return false
  if (!isStaff) return false

  return true
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

  if (path === 'hyChong') {
    if (memberId) return { page: 'member-recharge', memberId }
    return { page: 'members' }
  }
  if (path === 'hyTixian') {
    if (memberId) return { page: 'member-withdraw', memberId }
    return { page: 'members' }
  }
  if (path === 'hyTou') {
    if (memberId) return { page: 'member-bets', memberId }
    return { page: 'members' }
  }
  if (path === 'bindAddress' || path === 'bindBank') {
    if (memberId) return { page: 'member-payment', memberId }
    return { page: 'members' }
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
    case 'service-chat':
    case 'serviceChat':
      return { page: 'service-chat' }
    case 'bonus':
      return { page: 'bonus' }
    case 'games':
      return { page: 'games' }
    case 'draw-schedule':
    case 'drawSchedule':
      if (params.get('game')) {
        const gid = Number(params.get('game'))
        if (!Number.isNaN(gid)) return { page: 'draw-schedule', gameId: gid }
      }
      return { page: 'draw-schedule' }
    default:
      return { page: 'menu' }
  }
}

function legacyHashForRoute(route: AdminRoute): string | null {
  if (route.page === 'member-recharge' && route.memberId) {
    return `#/hyChong?user_id=${route.memberId}`
  }
  if (route.page === 'member-withdraw' && route.memberId) {
    return `#/hyTixian?user_id=${route.memberId}`
  }
  if (route.page === 'member-bets' && route.memberId) {
    return `#/hyTou?user_id=${route.memberId}`
  }
  if (route.page === 'member-payment' && route.memberId) {
    return `#/bindAddress?user_id=${route.memberId}`
  }
  if (route.page === 'identity') {
    return '#/admin/identity'
  }
  const legacy = AGENT_LEGACY_HASH[route.page]
  if (legacy) return `#/${legacy}`
  return null
}

export function adminNavigate(route: AdminRoute, memberName?: string) {
  if (memberName && route.memberId) {
    sessionStorage.setItem(`admin_member_${route.memberId}`, memberName)
  }

  const legacy = legacyHashForRoute(route)
  if (legacy) {
    window.location.hash = legacy.slice(1)
    return
  }

  let path = '#/admin'
  switch (route.page) {
    case 'menu':
      break
    case 'deposit-accounts':
      path = '#/admin/deposit-accounts'
      break
    case 'settings':
      path = '#/admin/settings'
      break
    case 'service-chat':
      path = '#/admin/service-chat'
      break
    case 'bonus':
      path = '#/admin/bonus'
      break
    case 'games':
      path = '#/admin/games'
      break
    case 'draw-schedule':
      path =
        route.gameId != null
          ? `#/admin/draw-schedule?game=${route.gameId}`
          : '#/admin/draw-schedule'
      break
    case 'identity':
      path = '#/admin/identity'
      break
    default:
      path = '#/admin'
  }
  window.location.hash = path.slice(1)
}

/** Agent deep links — e.g. #/hyChong?user_id=12 */
export function adminNavigateAgent(
  agentPath:
    | keyof typeof AGENT_ROUTE_MAP
    | 'hyChong'
    | 'hyTixian'
    | 'hyTou'
    | 'bindAddress'
    | 'bindBank',
  memberId?: number,
  memberName?: string,
) {
  if (memberId && memberName) {
    sessionStorage.setItem(`admin_member_${memberId}`, memberName)
  }
  if (
    memberId &&
    (agentPath === 'hyChong' ||
      agentPath === 'hyTixian' ||
      agentPath === 'hyTou' ||
      agentPath === 'bindAddress' ||
      agentPath === 'bindBank')
  ) {
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

export function goAdminMenu() {
  window.location.hash = '#/admin'
}
