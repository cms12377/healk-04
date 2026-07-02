import { useEffect, useState, type ReactNode } from 'react'
import { TabBar } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { useAuth } from '@/context/AuthContext'
import { getBankCards, getCryptoWallets } from '@/services/wallet'
import type { BankCard, CryptoWallet, SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface CardsPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

function CardsActionButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mt-5 flex h-10 w-full items-center justify-center rounded-full bg-[#86aeff] text-sm font-medium text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

function BankCardBlock({ card }: { card: BankCard }) {
  return (
    <div className="mb-1.5 w-full rounded-[5px] border border-[#ccc] bg-[#3181ca] p-2.5 text-sm text-white">
      <div>ชื่อ：{card.bankUsername}</div>
      <div className="my-5">ชื่อธนาคาร：{card.bankName}</div>
      <div>หมายเลขบัตร：{card.bankCard}</div>
    </div>
  )
}

function WalletBlock({ wallet }: { wallet: CryptoWallet }) {
  return (
    <div className="mb-1.5 w-full rounded-[5px] border border-[#ccc] bg-[#3181ca] p-2.5 text-sm text-white">
      <div className="my-5">หมายเหตุ：{wallet.remark}</div>
      <div className="my-5 break-all">ที่อยู่วอลเล็ต：{wallet.address}</div>
    </div>
  )
}

export function CardsPage({ onBack, onNavigate }: CardsPageProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState('bank')
  const [banks, setBanks] = useState<BankCard[]>([])
  const [wallets, setWallets] = useState<CryptoWallet[]>([])
  const [loadError, setLoadError] = useState('')

  const load = async () => {
    setLoadError('')
    try {
      const [bankList, walletList] = await Promise.all([getBankCards(), getCryptoWallets()])
      setBanks(bankList)
      setWallets(walletList)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const goPayPassword = () => onNavigate('edit-pay-password')

  const payPasswordLabel = user?.hasPayPassword ? 'เปลี่ยนรหัสเงินทุน' : 'เพิ่มรหัสเงินทุน'

  return (
    <SubPageShell title="ตั้งค่าถอน" variant="white" onBack={onBack}>
      <TabBar
        tabs={[
          { value: 'bank', label: 'บัตรธนาคาร' },
          { value: 'crypto', label: 'คริปโต' },
        ]}
        active={tab}
        onChange={setTab}
        variant="underline"
      />

      {loadError && (
        <p className="mx-3 mt-2 rounded-xl bg-[#ffebee] px-3 py-2 text-xs text-[#c62828]">{loadError}</p>
      )}

      {tab === 'bank' ? (
        <SubCard className="mt-0 rounded-none border-0 bg-white p-5 text-sm shadow-none ring-0">
          {banks.map((card) => (
            <BankCardBlock key={card.id} card={card} />
          ))}
          <CardsActionButton onClick={() => onNavigate('bind-bank')}>เพิ่มบัตร</CardsActionButton>
          <CardsActionButton onClick={goPayPassword}>{payPasswordLabel}</CardsActionButton>
        </SubCard>
      ) : (
        <SubCard className="mt-0 rounded-none border-0 bg-white p-5 text-sm shadow-none ring-0">
          {wallets.map((w) => (
            <WalletBlock key={w.id} wallet={w} />
          ))}
          <CardsActionButton onClick={() => onNavigate('virtual-add')}>เพิ่มคริปโต</CardsActionButton>
          <CardsActionButton onClick={goPayPassword}>{payPasswordLabel}</CardsActionButton>
        </SubCard>
      )}
    </SubPageShell>
  )
}
