import { useEffect, useState } from 'react'
import { PrimaryButton, TabBar } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { getBankCards, getCryptoWallets } from '@/services/wallet'
import type { BankCard, CryptoWallet, SubPage } from '@/types'

interface CardsPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

export function CardsPage({ onBack, onNavigate }: CardsPageProps) {
  const [tab, setTab] = useState('bank')
  const [banks, setBanks] = useState<BankCard[]>([])
  const [wallets, setWallets] = useState<CryptoWallet[]>([])

  const load = async () => {
    try {
      const [bankList, walletList] = await Promise.all([getBankCards(), getCryptoWallets()])
      setBanks(bankList)
      setWallets(walletList)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <SubPageShell title="ตั้งค่าถอน" variant="white" onBack={onBack}>
      <TabBar
        tabs={[
          { value: 'bank', label: 'บัญชีธนาคาร' },
          { value: 'crypto', label: 'กระเป๋าคริปโต' },
        ]}
        active={tab}
        onChange={setTab}
        variant="pill"
      />

      {tab === 'bank' ? (
        <SubCard className="mt-3 p-5 text-sm">
          {banks.map((card) => (
            <div
              key={card.id}
              className="mb-2 w-full rounded-xl bg-gradient-to-br from-[#3880e5] to-[#4e72f3] p-4 text-white shadow-sm"
            >
              <div className="text-xs text-white/75">ชื่อบัญชี</div>
              <div className="font-semibold">{card.bankUsername}</div>
              <div className="mt-3 text-xs text-white/75">ธนาคาร</div>
              <div>{card.bankName}</div>
              <div className="mt-2 text-xs text-white/75">เลขบัญชี</div>
              <div className="font-mono tabular-nums">{card.bankCard}</div>
            </div>
          ))}
          <PrimaryButton className="mt-3" onClick={() => onNavigate('bind-bank')}>
            เพิ่มบัญชีธนาคาร
          </PrimaryButton>
          <PrimaryButton className="mt-3" onClick={() => onNavigate('password-settings')}>
            ตั้งค่ารหัสผ่าน
          </PrimaryButton>
          <PrimaryButton className="mt-3" onClick={() => onNavigate('profits')}>
            สรุปกำไร-ขาดทุน
          </PrimaryButton>
        </SubCard>
      ) : (
        <SubCard className="mt-3 p-5 text-sm">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="mb-2 w-full rounded-xl bg-gradient-to-br from-[#3880e5] to-[#4e72f3] p-4 text-white shadow-sm"
            >
              <div className="text-xs text-white/75">ชื่อ</div>
              <div className="font-semibold">{w.remark}</div>
              <div className="mt-3 text-xs text-white/75">ที่อยู่</div>
              <div className="break-all font-mono text-xs">{w.address}</div>
            </div>
          ))}
          <PrimaryButton className="mt-3" onClick={() => onNavigate('virtual-add')}>
            เพิ่มกระเป๋าคริปโต
          </PrimaryButton>
          <PrimaryButton className="mt-3" onClick={() => onNavigate('password-settings')}>
            ตั้งค่ารหัสผ่าน
          </PrimaryButton>
        </SubCard>
      )}
    </SubPageShell>
  )
}
