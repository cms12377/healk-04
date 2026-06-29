import type { VipTier } from '@/types'

const TH6688 = 'https://th6688.vip'

export const VIP_BANNERS = {
  th: `${TH6688}/assets/vipBanner-th-1IJ-GAzu.png`,
  en: `${TH6688}/assets/vipBanner-en-CTmYjtyT.png`,
  zh: `${TH6688}/assets/vipBanner-wTvwAHWl.png`,
} as const

export const DEFAULT_VIP_TIERS: VipTier[] = [
  { level: 1, image: `${TH6688}/assets/1-BxIsJV4J.png`, depositRequired: 50000 },
  { level: 2, image: `${TH6688}/assets/2-B1RfYXkD.png`, depositRequired: 100000 },
  { level: 3, image: `${TH6688}/assets/3-DZoi8Bny.png`, depositRequired: 300000 },
  { level: 4, image: `${TH6688}/assets/4-DpO3PDbv.png`, depositRequired: 800000 },
  { level: 5, image: `${TH6688}/assets/5-vIQS-PPL.png`, depositRequired: 3000000 },
  { level: 6, image: `${TH6688}/assets/6-CTLuJNiL.png`, depositRequired: 8000000 },
]

export const ASSETS = {
  logo: '/assets/logo.jpg',
  loginBg: 'https://th6688.vip/assets/login_bg-mLn_IdxS.png',
  hotLottery: '/assets/hotLottery-x5UubMuW.png',
  all: '/assets/all-cgpxcFyc.png',
  lobby: '/assets/lobby-CZimZjU1.png',
  h1: '/assets/h1-BuIjQHpg.png',
  h2: '/assets/h2-CikLDLVd.png',
  h3: '/assets/h3-CCvcdKp0.png',
  h4: '/assets/h4-y3MIiySm.png',
  banner1: '/assets/banners/5e7d4bbe39c155668986f351cc5dcd8a.jpg',
  gameBanner: '/assets/games/game-select_red-C32t_Ktw.png',
  walletBg: '/assets/my/blue-BVzXFUw-.png',
  walletIcon: '/assets/my/qb-CySjdKPQ.png',
  betHistoryIcon: '/assets/my/jy-q43hYNKD.png',
  langIcon: '/assets/my/lang-CWQVhy2J.png',
  serviceIcon: '/assets/my/kefu2-D3qIuZKV.png',
  profitIcon: '/assets/my/profit.png',
  cardsIcon: '/assets/my/cards.png',
  logoutIcon: '/assets/my/logout.png',
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
  df_pk10: '/assets/games/df_pk10.png',
  df_pk10_3: '/assets/games/df_pk10_3.png',
  df_pk10_5: '/assets/games/df_pk10_5.png',
  df_k3: '/assets/games/df_k3.png',
  xam_6: '/assets/games/xam_6.png',
  xy_28: '/assets/games/xy_28.png',
  df_ssc: '/assets/games/df_ssc.png',
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
