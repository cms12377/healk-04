import type { VipTier } from '@/types'

/** All static assets served from this app's public/ folder — no external CDN */
function local(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export const VIP_BANNERS = {
  th: local('/assets/vip/vipBanner-th.png'),
  en: local('/assets/vip/vipBanner-th.png'),
  zh: local('/assets/vip/vipBanner-th.png'),
} as const

export const DEFAULT_VIP_TIERS: VipTier[] = [
  { level: 1, image: local('/assets/vip/1.png'), depositRequired: 50000 },
  { level: 2, image: local('/assets/vip/2.png'), depositRequired: 100000 },
  { level: 3, image: local('/assets/vip/3.png'), depositRequired: 300000 },
  { level: 4, image: local('/assets/vip/4.png'), depositRequired: 800000 },
  { level: 5, image: local('/assets/vip/5.png'), depositRequired: 3000000 },
  { level: 6, image: local('/assets/vip/6.png'), depositRequired: 8000000 },
]

export const ASSETS = {
  logo: local('/assets/logo.jpg'),
  loginBg: local('/assets/login_bg.png'),
  hotLottery: local('/assets/hotLottery.png'),
  all: local('/assets/all.png'),
  lobby: local('/assets/lobby.png'),
  h1: local('/assets/h1.png'),
  h2: local('/assets/h2.png'),
  h3: local('/assets/h3.png'),
  h4: local('/assets/h4.png'),
  banner1: local('/assets/banners/home.jpg'),
  gameBanner: local('/assets/games/game-select_red.png'),
  walletBg: local('/assets/my/blue.png'),
  walletIcon: local('/assets/qb.png'),
  betHistoryIcon: local('/assets/jy.png'),
  langIcon: local('/assets/lang.png'),
  serviceIcon: local('/assets/kefu2.png'),
  profitIcon: local('/assets/my/profit.png'),
  cardsIcon: local('/assets/my/cards.png'),
  logoutIcon: local('/assets/my/logout.png'),
  vipBanner: VIP_BANNERS.th,
  vip1: DEFAULT_VIP_TIERS[0].image,
  vip2: DEFAULT_VIP_TIERS[1].image,
  vip3: DEFAULT_VIP_TIERS[2].image,
  vip4: DEFAULT_VIP_TIERS[3].image,
  vip5: DEFAULT_VIP_TIERS[4].image,
  vip6: DEFAULT_VIP_TIERS[5].image,
} as const

export const TAB_ICONS = {
  home: {
    active: '/assets/tabs/Y_.png',
    inactive: '/assets/tabs/q_.png',
  },
  game: '/assets/tabs/Fu.png',
  bonus: {
    active: '/assets/tabs/bonus-active.png',
    inactive: '/assets/tabs/X_.png',
  },
  service: '/assets/tabs/Vu.png',
  my: {
    active: '/assets/tabs/Q_.png',
    inactive: '/assets/tabs/J_.png',
  },
} as const

export const GAME_IMAGES: Record<string, string> = {
  df_pk10: local('/assets/games/df_pk10.png'),
  df_pk10_3: local('/assets/games/df_pk10_3.png'),
  df_pk10_5: local('/assets/games/df_pk10_5.png'),
  df_k3: local('/assets/games/df_k3.png'),
  xam_6: local('/assets/games/xam_6.png'),
  xy_28: local('/assets/games/xy_28.png'),
  df_ssc: local('/assets/games/df_ssc.png'),
}

export function resolveGameImage(code: string, dbImage?: string): string {
  if (dbImage?.startsWith('http')) return dbImage
  if (GAME_IMAGES[code]) return GAME_IMAGES[code]
  if (dbImage?.startsWith('/')) return local(dbImage)
  return GAME_IMAGES.df_pk10
}

export const GAME_LABELS: Record<string, string> = {
  df_pk10: 'PK10 10 นาที',
  df_pk10_3: 'PK10 3 นาที',
  df_pk10_5: 'PK10 5 นาที',
  df_k3: 'K3',
  xam_6: 'Mark Six (ฮ่องกง)',
  xy_28: 'Lucky 28',
  df_ssc: 'หวยรัฐบาล',
}
