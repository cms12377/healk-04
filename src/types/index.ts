export type LotteryGameType = 'pk10' | 'k3' | 'marksix' | 'lucky28' | 'ssc'

export interface BetOption {
  id: string
  label: string
  odds: number
  betContent?: string
  playItemId?: number
}

export interface DrawRecord {
  id: number
  issue: string
  numbers: string[]
  drawTime: string
  analyz?: {
    dx?: string
    ds?: string
    wave?: string
    zodiac?: string[]
    result?: string[]
    dxList?: string[]
    dsList?: string[]
  }
}

export interface SelectedBetItem {
  option: BetOption
  groupName: string
  categoryName?: string
  amount: number
}

export type SubPage =
  | 'wallet-notes'
  | 'game-bet'
  | 'profile'
  | 'profits'
  | 'purses'
  | 'cards'
  | 'recharge'
  | 'transfer-bank'
  | 'virtual-recharge'
  | 'withdraw'
  | 'edit-password'
  | 'edit-pay-password'
  | 'password-settings'
  | 'lang'
  | 'bind-bank'
  | 'virtual-add'

export type UserRole = 'member' | 'agent' | 'admin'

export interface User {
  id: number
  username: string
  nickname: string
  avatar: string
  token: string
  balance: number
  dayWin?: number
  unsettled?: number
  hasPayPassword?: boolean
  role?: UserRole
}

export interface BankCard {
  id: string
  bankName: string
  bankUsername: string
  bankCard: string
}

export interface CryptoWallet {
  id: string
  remark: string
  address: string
}

export interface WalletRecord {
  id: number
  categoryId: number
  categoryLabel: string
  money: number
  createtime: number
}

export interface BetRecord {
  id: number
  gamesName: string
  issue: string
  betContent: string
  categoryName: string
  amount: number
  winAmount: number
  status: '0' | '1'
  statusText: string
  isWin: '0' | '1'
  isWinText: string
  createtime: number
}

export interface ProfitSummary {
  countWinAmount: number
  rechargeCount: number
  withdrawCount: number
}

export interface WithdrawConfig {
  withdrawMin: number
  withdrawMax: number
  withdrawFee: number
}

export interface RechargeChannel {
  id: string
  name: string
  type: 'bank' | 'crypto'
  quickAmounts: string[]
}

export interface TransferBankInfo {
  bankName: string
  bankUsername: string
  bankCard: string
  notice?: string
}

export interface LotteryItem {
  id: number
  code: string
  name: string
  image: string
  description?: string
  isHot?: boolean
  categoryId?: number
}

export interface BannerItem {
  id: number
  image: string
  url?: string
}

export interface Promotion {
  id: number
  title: string
  text: string
  images: string
  categoryId: 68 | 69
}

export type ActivityCategory = 68 | 69

export interface VipTier {
  level: number
  image: string
  depositRequired: number
}

export interface SiteMessage {
  id: number
  title: string
  content: string
  createtime: number
  read: boolean
}

export interface GameItem {
  id: number
  code: string
  name: string
  image: string
  category: string
}

export type TabId = 'home' | 'game' | 'bonus' | 'service' | 'my'

export type AppView =
  | TabId
  | 'login'
  | 'register'
  | 'lang'
  | { type: 'lottery-lobby'; filter?: 'hot' | 'all'; from?: TabId }
  | { type: 'lottery'; code: string; id: number; from?: TabId }
  | { type: 'lottery-history'; gameId: number; code: string; from?: TabId }
  | { type: 'lottery-rule'; gameId: number; code: string; from?: TabId; lotteryReturn?: boolean }
  | { type: 'bonus-promotions' }
  | { type: 'bonus-messages' }
  | { type: 'bonus-message'; id: number }
  | { type: 'sub'; page: SubPage; params?: Record<string, string> }

export interface HomeData {
  carousel: BannerItem[]
  lotteries: LotteryItem[]
  notice?: string
  winners?: WinningItem[]
}

export interface WinningItem {
  id: number
  gamesName: string
  username: string
  winAmount: number
}

export interface ServiceConfig {
  serviceUrl: string
}

export type DateRangeKey = 'last7Days' | 'dayBeforeYesterday' | 'yesterday' | 'today'

export interface DateRange {
  startDate: string
  endDate: string
}

export type AdminPage =
  | 'menu'
  | 'recharge'
  | 'withdraw'
  | 'bets'
  | 'members'
  | 'member-recharge'
  | 'member-withdraw'
  | 'member-bets'
  | 'chongzhi'

export interface AdminDepositOrder {
  id: number
  userId: number
  username: string
  amount: number
  status: string
  statusText: string
  createtime: number
  adminNote?: string
}

export interface AdminWithdrawOrder {
  id: number
  userId: number
  username: string
  amount: number
  fee: number
  status: string
  statusText: string
  createtime: number
  adminNote?: string
}

export interface AdminBetRecord {
  id: number
  userId: number
  username: string
  gamesName: string
  drawNumber: string
  number: string
  position?: string
  amount: number
  betAmount: number
  multiple: number
  winAmount: number
  status: string
  statusText: string
  createtime: number
}

export interface AdminMember {
  id: number
  username: string
  nickname: string
  money: number
  createtime: number
  jointimeText: string
}

export type AdminOrderStatus = 'all' | '0' | '1' | '2'

export interface AdminListResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
