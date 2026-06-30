import { getGameRoute } from '@/services/lotteryUtils'
import type { AppView, SubPage, TabId } from '@/types'

const GAME_PATHS = new Set(['pkShi', 'kuaisan', 'aoLiu', 'xingyun', 'xingYun', 'shiShiCai'])

const MY_SUB_PATHS: Record<string, SubPage> = {
  rechargeNotes: 'wallet-notes',
  gameBet: 'game-bet',
  profit: 'profile',
  profits: 'profits',
  purses: 'purses',
  cards: 'cards',
  recharge: 'recharge',
  withdraw: 'withdraw',
  transferBank: 'transfer-bank',
  virtual: 'virtual-recharge',
  bindBank: 'bind-bank',
  virtualAdd: 'virtual-add',
  setPwd: 'password-settings',
  editPwd: 'edit-password',
  editPwdto: 'edit-pay-password',
}

function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (!search) return params
  for (const part of search.replace(/^\?/, '').split('&')) {
    const [k, v] = part.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
  }
  return params
}

function buildQuery(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

function parseMySubRoute(path: string, query: Record<string, string>): AppView | null {
  const page = MY_SUB_PATHS[path]
  if (!page) return null

  const params: Record<string, string> = {}

  switch (page) {
    case 'wallet-notes':
      params.category = query.type ?? 'all'
      break
    case 'game-bet':
      params.status = query.type === '1' ? '1' : '0'
      break
    case 'transfer-bank':
    case 'virtual-recharge':
      params.amount = query.money ?? query.amount ?? '0'
      if (query.id) params.id = query.id
      break
    default:
      break
  }

  return { type: 'sub', page, params: Object.keys(params).length ? params : undefined }
}

export function parseMemberHash(hash = window.location.hash): AppView | null {
  const raw = hash.replace(/^#/, '').replace(/^\//, '')
  if (!raw || raw === '/') return 'home'
  if (raw.startsWith('admin')) return null

  const qIdx = raw.indexOf('?')
  const path = (qIdx >= 0 ? raw.slice(0, qIdx) : raw).replace(/\/$/, '')
  const query = parseQuery(qIdx >= 0 ? raw.slice(qIdx) : '')

  switch (path) {
    case 'login':
      return 'login'
    case 'register':
      return 'register'
    case 'lang':
      return 'lang'
    case 'allGame':
      return 'game'
    case 'caijin':
    case 'caiJin':
      return 'bonus'
    case 'activity':
      return { type: 'bonus-promotions' }
    case 'msg':
      return { type: 'bonus-messages' }
    case 'msgDetail': {
      const id = Number(query.id)
      if (Number.isNaN(id)) return null
      return { type: 'bonus-message', id }
    }
    case 'service':
      return 'service'
    case 'my':
      return 'my'
    case 'lotteryLobby': {
      const filter = query.filter === 'hot' ? 'hot' : query.filter === 'all' ? 'all' : undefined
      return { type: 'lottery-lobby', filter, from: 'home' }
    }
    case 'history': {
      const gameId = Number(query.id)
      const code = query.type ?? query.code ?? ''
      if (Number.isNaN(gameId) || !code) return null
      return { type: 'lottery-history', gameId, code, from: 'home' }
    }
    case 'rule': {
      const gameId = Number(query.id ?? query.games_id)
      const code = query.type ?? query.code ?? ''
      if (Number.isNaN(gameId) || !code) return null
      return {
        type: 'lottery-rule',
        gameId,
        code,
        from: 'game',
        lotteryReturn: query.from === 'lottery',
      }
    }
    default:
      break
  }

  const subView = parseMySubRoute(path, query)
  if (subView) return subView

  if (GAME_PATHS.has(path)) {
    const code = query.type ?? ''
    const id = Number(query.category_id ?? query.games_id)
    if (!code || Number.isNaN(id)) return null
    return { type: 'lottery', code, id, from: 'game' }
  }

  return null
}

export function memberHashFromView(view: AppView): string {
  if (view === 'home') return '#/'
  if (view === 'login') return '#/login'
  if (view === 'register') return '#/register'
  if (view === 'lang') return '#/lang'
  if (view === 'game') return '#/allGame'
  if (view === 'bonus') return '#/caijin'
  if (view === 'service') return '#/service'
  if (view === 'my') return '#/my'

  if (typeof view === 'object') {
    switch (view.type) {
      case 'lottery-lobby': {
        const filter = view.filter ? `?filter=${view.filter}` : ''
        return `#/lotteryLobby${filter}`
      }
      case 'lottery': {
        const route = getGameRoute(view.code).replace(/^\//, '')
        return `#/${route}${buildQuery({ type: view.code, category_id: String(view.id) })}`
      }
      case 'lottery-history':
        return `#/history${buildQuery({ id: String(view.gameId), type: view.code })}`
      case 'lottery-rule':
        return `#/rule${buildQuery({
          id: String(view.gameId),
          type: view.code,
          from: view.lotteryReturn ? 'lottery' : undefined,
        })}`
      case 'bonus-promotions':
        return '#/activity'
      case 'bonus-messages':
        return '#/msg'
      case 'bonus-message':
        return `#/msgDetail?id=${view.id}`
      case 'sub':
        return subPageHash(view.page, view.params)
      default:
        break
    }
  }

  return '#/'
}

function subPageHash(page: SubPage, params?: Record<string, string>): string {
  switch (page) {
    case 'wallet-notes':
      return `#/rechargeNotes${buildQuery({ type: params?.category ?? 'all' })}`
    case 'game-bet':
      return `#/gameBet${buildQuery({ type: params?.status ?? '0' })}`
    case 'profile':
      return '#/profit'
    case 'profits':
      return '#/profits'
    case 'purses':
      return '#/purses'
    case 'cards':
      return '#/cards'
    case 'recharge':
      return '#/recharge'
    case 'withdraw':
      return '#/withdraw'
    case 'transfer-bank':
      return `#/transferBank${buildQuery({
        money: params?.amount,
        id: params?.id,
      })}`
    case 'virtual-recharge':
      return `#/virtual${buildQuery({
        money: params?.amount,
        id: params?.id,
      })}`
    case 'bind-bank':
      return '#/bindBank'
    case 'virtual-add':
      return '#/virtualAdd'
    case 'password-settings':
      return '#/setPwd'
    case 'edit-password':
      return '#/editPwd'
    case 'edit-pay-password':
      return '#/editPwdto'
    case 'lang':
      return '#/lang'
    default:
      return '#/my'
  }
}

export function memberNavigate(view: AppView, replace = false) {
  const hash = memberHashFromView(view)
  if (replace) {
    const url = `${window.location.pathname}${window.location.search}${hash}`
    window.history.replaceState(null, '', url)
  } else {
    window.location.hash = hash.slice(1)
  }
}

export function tabFromView(view: AppView): TabId {
  if (typeof view === 'object') {
    if (view.type === 'sub') return 'my'
    if (
      view.type === 'bonus-promotions' ||
      view.type === 'bonus-messages' ||
      view.type === 'bonus-message'
    ) {
      return 'bonus'
    }
    if (view.type === 'lottery' || view.type === 'lottery-lobby') return 'game'
    if (view.type === 'lottery-history' || view.type === 'lottery-rule') return 'game'
  }
  if (typeof view === 'string' && view !== 'login' && view !== 'register' && view !== 'lang') {
    return view
  }
  return 'home'
}

export function isMySubView(view: AppView): boolean {
  return typeof view === 'object' && view.type === 'sub'
}
