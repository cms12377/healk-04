import { useEffect, useState } from 'react'
import { PageNavBar, PrimaryButton, TabBar } from '@/components/common/PageNavBar'
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
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ตั้งค่าถอน" variant="white" showBack onBack={onBack} />
      <TabBar
        tabs={[
          { value: 'bank', label: 'บัญชีธนาคาร' },
          { value: 'crypto', label: 'กระเป๋าคริปโต' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'bank' ? (
        <div className="bg-white p-5 text-sm">
          {banks.map((card) => (
            <div
              key={card.id}
              className="bor mb-1.5 w-full rounded-md border border-[#ccc] bg-[#3181ca] p-2.5 text-white"
            >
              <div>ชื่อบัญชี：{card.bankUsername}</div>
              <div className="my-5">ธนาคาร：{card.bankName}</div>
              <div>เลขบัญชี：{card.bankCard}</div>
            </div>
          ))}
          <PrimaryButton className="mt-5" onClick={() => onNavigate('bind-bank')}>
            เพิ่มบัญชีธนาคาร
          </PrimaryButton>
          <PrimaryButton className="mt-5" onClick={() => onNavigate('password-settings')}>
            ตั้งค่ารหัสผ่าน
          </PrimaryButton>
          <PrimaryButton
            className="mt-3"
            onClick={() => onNavigate('profits')}
          >
            สรุปกำไร-ขาดทุน
          </PrimaryButton>
        </div>
      ) : (
        <div className="bg-white p-5 text-sm">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="bor mb-1.5 w-full rounded-md border border-[#ccc] bg-[#3181ca] p-2.5 text-white"
            >
              <div className="my-5">ชื่อ：{w.remark}</div>
              <div>ที่อยู่：{w.address}</div>
            </div>
          ))}
          <PrimaryButton className="mt-5" onClick={() => onNavigate('virtual-add')}>
            เพิ่มกระเป๋าคริปโต
          </PrimaryButton>
          <PrimaryButton className="mt-3" onClick={() => onNavigate('password-settings')}>
            ตั้งค่ารหัสผ่าน
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}
