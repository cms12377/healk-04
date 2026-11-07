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
  | 'bind-address'
  | 'identity-card'
  | 'deposit-history'

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
  identityStatus?: string
  role?: UserRole
  isBlocked?: boolean
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
  type?: string
}

export interface MemberDepositOrder {
  id: number
  amount: number
  channelType: string
  payerName?: string
  proofImage?: string
  status: string
  statusText: string
  createtime: number
  adminNote?: string
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
  /** 1 = open (visible to members), 0 = closed by admin */
  status?: number
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
  | { type: 'lottery-orders'; gameId: number; code: string; issue?: string; from?: TabId }
  | { type: 'lottery-settled'; gameId: number; code: string; issue?: string; from?: TabId }
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
  /** @deprecated Internal chat — no external URL */
  serviceUrl: string
}

export type ServiceMessageSender = 'member' | 'staff' | 'system'

export type ServiceMessageType = 'text' | 'image' | 'file'

export interface ServiceChatMessage {
  id: number
  senderType: ServiceMessageSender
  msgType: ServiceMessageType
  content: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentMime?: string
  isDeleted: boolean
  createtime: number
  updatetime: number
  senderName?: string
}

export interface AdminServiceConversation {
  id: number
  userId?: number
  guestKey?: string
  status: number
  lastMessageAt: number
  lastPreview?: string
  unreadStaff: number
  unreadMember: number
  username?: string
  displayName: string
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
  | 'member-payment'
  | 'identity'
  | 'chongzhi'
  | 'deposit-accounts'
  | 'settings'
  | 'service-chat'
  | 'bonus'
  | 'games'
  | 'draw-schedule'

export type ScheduledDrawFilter = 'all' | 'pending' | 'filled' | 'used' | 'cancelled'

export interface ScheduledDrawRow {
  id: number
  gamesId: number
  issue: string
  drawTime: number
  result?: string
  status: number
  locked: boolean
  createtime: number
  updatedAt?: number
}

export interface ScheduledDrawGenerateResult {
  created: number
  skipped: number
  mode: string
  cycleSeconds: number
  openIssue?: string
  firstIssue?: string
  lastIssue?: string
  effectiveStart?: number
  warning?: string
  synced?: boolean
}

export interface AdminActivity {
  id: number
  categoryId: ActivityCategory
  title: string
  text: string
  images: string
  status: number
  sort: number
  createtime: number
}

export interface AdminVipTierRow {
  level: number
  image: string
  depositRequired: number
  sort: number
}

export interface AdminUserNotice {
  id: number
  scope: 'broadcast' | 'user'
  userId?: number
  username?: string
  title: string
  content: string
  createtime: number
}

export interface AdminRechargeChannel {
  id: number
  type: 'bank' | 'crypto'
  name: string
  bankName?: string
  bankUsername?: string
  bankCard?: string
  address?: string
  qrcode?: string
  notice?: string
  quickAmounts: string[]
  status: number
  sort: number
}

export interface AdminIdentityRequest {
  userId: number
  username: string
  nickname: string
  realName: string
  idNumber: string
  identityFrontUrl?: string
  identityBackUrl?: string
  identityStatus: string
  createtime: number
  jointimeText: string
}

export interface AdminMemberPaymentInfo {
  user: {
    id: number
    username: string
    nickname: string
    realName?: string
    idNumber?: string
    identityStatus: string
    money: number
  }
  bankCards: {
    id: number
    bankName: string
    bankUsername: string
    bankCard: string
    isDefault: boolean
    createtime: number
  }[]
  cryptoWallets: {
    id: number
    address: string
    remark?: string
    isDefault: boolean
    createtime: number
  }[]
}

export interface AdminSiteSettings {
  notice: string
  serviceUrl: string
  currency: string
}

export interface AdminGameInfo {
  id: number
  code: string
  name: string
  gameType: string
  status: number
  sort: number
  drawMode: 'random' | 'manual'
  nextDrawResult?: string
  cycleSeconds?: number
  cycleLabel?: string
  isOverdue?: boolean
  issue?: string
  drawTime?: number
  secondsLeft?: number | null
  lastIssue?: string
  lastResult?: string
}

export interface AdminAdvanceResult {
  skipped: boolean
  reason?: string
  drawnIssue?: string
  result?: string
  settled?: number
  newIssue?: string
  drawTime?: number
  secondsLeft?: number
}

export interface AdminDepositOrder {
  id: number
  userId: number
  username: string
  amount: number
  status: string
  statusText: string
  createtime: number
  adminNote?: string
  channelType?: 'bank' | 'crypto'
  channelName?: string
  payerName?: string
  proofImage?: string
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
  withdrawType?: 'bank' | 'crypto'
  bankName?: string
  bankCard?: string
  bankUsername?: string
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
  isWin: '0' | '1'
  createtime: number
}

export interface AdminMember {
  id: number
  username: string
  nickname: string
  phone?: string
  money: number
  status: number
  createtime: number
  jointimeText: string
  realName?: string
  identityStatus?: string
  invitedBy?: number
  hasPayPassword?: boolean
}

export type AdminOrderStatus = 'all' | '0' | '1' | '2'

export interface AdminListResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
