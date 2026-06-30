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

/** Resolve static asset via th6688 CDN (matches bundled filenames) */
function asset(local: string): string {
  return `${TH6688}${local.startsWith('/') ? local : `/${local}`}`
}

export const ASSETS = {
  logo: asset('/assets/logo.jpg'),
  loginBg: `${TH6688}/assets/login_bg-mLn_IdxS.png`,
  hotLottery: asset('/assets/hotLottery-x5UubMuW.png'),
  all: asset('/assets/all-cgpxcFyc.png'),
  lobby: asset('/assets/lobby-CZimZjU1.png'),
  h1: asset('/assets/h1-BuIjQHpg.png'),
  h2: asset('/assets/h2-CikLDLVd.png'),
  h3: asset('/assets/h3-CCvcdKp0.png'),
  h4: asset('/assets/h4-y3MIiySm.png'),
  banner1: asset('/assets/banners/5e7d4bbe39c155668986f351cc5dcd8a.jpg'),
  gameBanner: asset('/assets/games/game-select_red-C32t_Ktw.png'),
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

/** Game icons from th6688 backend (DB seed paths /assets/games/*.png are not hosted) */
const LAOADMIN = 'https://laoadmin.top/uploads/20250901'

export const GAME_IMAGES: Record<string, string> = {
  df_pk10: `${LAOADMIN}/9e1e2c9e273276a63cf39435a1d0aa21.png`,
  df_pk10_3: `${LAOADMIN}/4d04d493eddd875cb33d4acf4e8f074d.png`,
  df_pk10_5: `${LAOADMIN}/22492eaaaddd9de0bc3e0e97fc31b646.png`,
  df_k3: `${LAOADMIN}/17a26763db42b3e59e4b88431660d092.png`,
  xam_6: `${LAOADMIN}/ca0493ff76bc02dcd9de10f41afb14a4.png`,
  xy_28: `${LAOADMIN}/1bd597045cbbabc028820c54557b11f5.png`,
  df_ssc: `${LAOADMIN}/bd6b5dd37143196e6090c529c47c927d.png`,
  // df_k3, xam_6, xy_28, df_ssc are RGB PNGs with baked-in black corners (laoadmin source)
}

export function resolveGameImage(code: string, dbImage?: string): string {
  if (dbImage?.startsWith('http')) return dbImage
  if (GAME_IMAGES[code]) return GAME_IMAGES[code]
  if (dbImage?.startsWith('/')) return asset(dbImage)
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
