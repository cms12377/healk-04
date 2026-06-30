import { ArrowUpFromLine, Receipt, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { SubPageShell } from '@/components/my/sub/SubPageShell'
import { useAuth } from '@/context/AuthContext'
import { getBankCards, getCryptoWallets } from '@/services/wallet'
import type { SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface PursesPageProps {
  onBack: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
}

export function PursesPage({ onBack, onNavigate }: PursesPageProps) {
  const { user } = useAuth()

  const goWithdraw = async () => {
    if (!user?.hasPayPassword) {
      onNavigate('edit-pay-password')
      return
    }
    try {
      const [banks, wallets] = await Promise.all([getBankCards(), getCryptoWallets()])
      if (banks.length === 0 && wallets.length === 0) {
        onNavigate('bind-bank')
        return
      }
      onNavigate('withdraw')
    } catch {
      onNavigate('withdraw')
    }
  }

  return (
    <SubPageShell
      title="กระเป๋าเงิน"
      onBack={onBack}
      rightLabel="รายการ"
      onRightClick={() => onNavigate('wallet-notes', { category: 'all' })}
    >
      <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] p-5 text-white shadow-lg shadow-[#3880e5]/20 ring-1 ring-white/10">
        <p className="text-sm text-white/80">ยอดรวมสินทรัพย์</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            ฿{user?.balance.toLocaleString() ?? 0}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('recharge')}
            className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#4e72f3] shadow-sm transition active:scale-[0.98]"
          >
            ฝากเงิน
          </button>
        </div>
      </div>

      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <WalletAction
          icon={<ArrowUpFromLine className="h-5 w-5" strokeWidth={2} />}
          label="ถอนเงิน"
          onClick={() => void goWithdraw()}
        />
        <WalletAction
          icon={<Settings className="h-5 w-5" strokeWidth={2} />}
          label="จัดการบัญชี"
          onClick={() => onNavigate('cards')}
        />
        <WalletAction
          icon={<Receipt className="h-5 w-5" strokeWidth={2} />}
          label="รายการ"
          onClick={() => onNavigate('wallet-notes', { category: 'all' })}
        />
      </div>
    </SubPageShell>
  )
}

function WalletAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl bg-white px-2 py-4 shadow-sm ring-1 ring-black/5 transition hover:bg-[#f8faff] active:scale-[0.98]"
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4e72f3]')}>
        {icon}
      </span>
      <span className="text-xs font-medium text-[#535867]">{label}</span>
    </button>
  )
}
