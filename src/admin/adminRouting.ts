import type { AdminPage } from '@/types'

export interface AdminRoute {
  page: AdminPage
  memberId?: number
  memberName?: string
}

export function parseAdminHash(hash = window.location.hash): AdminRoute | null {
  const path = hash.replace(/^#/, '').replace(/^\//, '')
  if (!path.startsWith('admin')) return null

  const parts = path.split('/').filter(Boolean)
  if (parts.length === 1) return { page: 'menu' }

  switch (parts[1]) {
    case 'recharge':
      return { page: 'recharge' }
    case 'withdraw':
      return { page: 'withdraw' }
    case 'bets':
      return { page: 'bets' }
    case 'members':
      if (parts.length >= 4) {
        const id = Number(parts[2])
        if (Number.isNaN(id)) return { page: 'members' }
        if (parts[3] === 'recharge') return { page: 'member-recharge', memberId: id }
        if (parts[3] === 'withdraw') return { page: 'member-withdraw', memberId: id }
        if (parts[3] === 'bets') return { page: 'member-bets', memberId: id }
      }
      return { page: 'members' }
    case 'chongzhi':
      return { page: 'chongzhi' }
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
    case 'chongzhi':
      path = '#/admin/chongzhi'
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

export function getStoredMemberName(id: number): string | undefined {
  return sessionStorage.getItem(`admin_member_${id}`) ?? undefined
}

export function goMemberApp() {
  window.location.hash = '#/'
}
