import { PageNavBar } from '@/components/common/PageNavBar'
import { useAuth } from '@/context/AuthContext'
import { getBankCards, getCryptoWallets } from '@/services/wallet'
import type { SubPage } from '@/types'

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
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar
        title="กระเป๋าเงิน"
        showBack
        onBack={onBack}
        rightLabel="รายการ"
        onRightClick={() => onNavigate('wallet-notes', { category: 'all' })}
      />

      <div className="p-5 md:p-10">
        <div className="rounded-md bg-white p-4 text-sm text-[#778899] md:p-10 md:text-lg">
          <div>ยอดรวมสินทรัพย์</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl font-semibold text-black md:text-4xl">
              ฿{user?.balance.toLocaleString() ?? 0}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('recharge')}
              className="rounded-full bg-[#8bb1ff] px-5 py-1.5 text-white"
            >
              ฝากเงิน
            </button>
          </div>

          <div className="mt-5 flex items-center justify-evenly">
            <button
              type="button"
              onClick={() => void goWithdraw()}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-lg">
                ↓
              </span>
              <span className="text-xs">ถอนเงิน</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cards')}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-lg">
                ⚙
              </span>
              <span className="text-xs">จัดการบัญชี</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
