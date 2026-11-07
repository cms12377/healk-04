import type { SubPage } from '@/types'
import { BindAddressPage } from './BindAddressPage'
import { BindBankPage } from './BindBankPage'
import { CardsPage } from './CardsPage'
import { DepositHistoryPage } from './DepositHistoryPage'
import { EditPasswordPage } from './EditPasswordPage'
import { EditPayPasswordPage } from './EditPayPasswordPage'
import { GameBetPage } from './GameBetPage'
import { IdentityCardPage } from './IdentityCardPage'
import { LangPage } from './LangPage'
import { PasswordSettingsPage } from './PasswordSettingsPage'
import { ProfilePage } from './ProfilePage'
import { ProfitsPage } from './ProfitsPage'
import { PursesPage } from './PursesPage'
import { RechargePage } from './RechargePage'
import { TransferBankPage } from './TransferBankPage'
import { VirtualAddPage } from './VirtualAddPage'
import { VirtualRechargePage } from './VirtualRechargePage'
import { WalletNotesPage } from './WalletNotesPage'
import { WithdrawPage } from './WithdrawPage'

interface SubPageRouterProps {
  page: SubPage
  params?: Record<string, string>
  onBack: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
  onReLogin?: () => void
}

export function SubPageRouter({
  page,
  params,
  onBack,
  onNavigate,
  onReLogin,
}: SubPageRouterProps) {
  switch (page) {
    case 'wallet-notes':
      return (
        <WalletNotesPage onBack={onBack} initialCategory={params?.category ?? 'all'} />
      )
    case 'game-bet':
      return (
        <GameBetPage
          onBack={onBack}
          initialStatus={(params?.status as '0' | '1') ?? '0'}
        />
      )
    case 'profile':
      return <ProfilePage onBack={onBack} onNavigate={onNavigate} />
    case 'profits':
      return <ProfitsPage onBack={onBack} onNavigate={onNavigate} />
    case 'purses':
      return <PursesPage onBack={onBack} onNavigate={onNavigate} />
    case 'cards':
      return <CardsPage onBack={onBack} onNavigate={onNavigate} />
    case 'recharge':
      return <RechargePage onBack={onBack} onNavigate={onNavigate} />
    case 'transfer-bank':
      return (
        <TransferBankPage
          amount={params?.amount ?? '0'}
          channelId={params?.id}
          onBack={onBack}
          onSuccess={onBack}
        />
      )
    case 'virtual-recharge':
      return (
        <VirtualRechargePage
          amount={params?.amount ?? '0'}
          channelId={params?.id}
          onBack={onBack}
          onSuccess={onBack}
        />
      )
    case 'withdraw':
      return (
        <WithdrawPage
          onBack={onBack}
          onNavigate={onNavigate}
          onOpenNotes={() => onNavigate('wallet-notes')}
        />
      )
    case 'password-settings':
      return <PasswordSettingsPage onBack={onBack} onNavigate={onNavigate} />
    case 'edit-password':
      return <EditPasswordPage onBack={onBack} onReLogin={onReLogin} />
    case 'edit-pay-password':
      return <EditPayPasswordPage onBack={onBack} />
    case 'lang':
      return <LangPage onBack={onBack} />
    case 'bind-bank':
      return <BindBankPage onBack={onBack} onNavigate={onNavigate} />
    case 'virtual-add':
      return <VirtualAddPage onBack={onBack} />
    case 'bind-address':
      return <BindAddressPage onBack={onBack} />
    case 'identity-card':
      return <IdentityCardPage onBack={onBack} />
    case 'deposit-history':
      return <DepositHistoryPage onBack={onBack} />
    default:
      return null
  }
}

export { SubPageRouter as default }
