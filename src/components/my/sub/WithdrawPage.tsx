import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PageNavBar,
  PrimaryButton,
  TabBar,
} from '@/components/common/PageNavBar'
import { getWithdrawConfig, submitWithdraw } from '@/services/api'
import { getBankCards, getCryptoWallets } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'
import type { BankCard, CryptoWallet, SubPage, WithdrawConfig } from '@/types'
import { cn } from '@/lib/utils'

interface WithdrawPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
  onOpenNotes: () => void
}

export function WithdrawPage({ onBack, onNavigate, onOpenNotes }: WithdrawPageProps) {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState('bank')
  const [amount, setAmount] = useState('')
  const [payPwd, setPayPwd] = useState('')
  const [config, setConfig] = useState<WithdrawConfig | null>(null)
  const [banks, setBanks] = useState<BankCard[]>([])
  const [wallets, setWallets] = useState<CryptoWallet[]>([])
  const [selectedBank, setSelectedBank] = useState(0)
  const [selectedWallet, setSelectedWallet] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const [cfg, bankList, walletList] = await Promise.all([
          getWithdrawConfig(),
          getBankCards(),
          getCryptoWallets(),
        ])
        setConfig(cfg)
        setBanks(bankList)
        setWallets(walletList)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  const fillMax = () => {
    if (user) setAmount(String(user.balance))
  }

  const handleSubmit = async () => {
    if (!user?.hasPayPassword) {
      onNavigate('edit-pay-password')
      return
    }
    const num = Number(amount)
    setLoading(true)
    setError('')
    try {
      const isBank = tab === 'bank'
      const bank = banks[selectedBank]
      const wallet = wallets[selectedWallet]

      await submitWithdraw(num, payPwd, {
        type: isBank ? 'bank' : 'crypto',
        bankName: isBank ? bank?.bankName : undefined,
        bankCard: isBank ? bank?.bankCard : wallet?.address,
        bankUsername: isBank ? bank?.bankUsername : wallet?.remark,
      })
      await refreshUser()
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar
        title="ถอนเงิน"
        showBack
        onBack={onBack}
        rightLabel="บันทึก"
        onRightClick={onOpenNotes}
      />
      <TabBar
        tabs={[
          { value: 'bank', label: 'ถอนผ่านธนาคาร' },
          { value: 'crypto', label: 'ถอนคริปโต' },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="bg-white p-5 text-sm text-[#333]">
        <FormField label="จำนวนเงิน">
          <InputBox value={amount} onChange={setAmount} prefix="฿" type="number" />
        </FormField>
        <div className="mb-4 flex items-center justify-between text-[#5b7ffb]">
          <span>ยอดคงเหลือ：{user?.balance.toLocaleString() ?? 0}</span>
          <button type="button" onClick={fillMax}>
            ถอนทั้งหมด
          </button>
        </div>
        <FormField label="รหัสผ่านถอน">
          <InputBox
            value={payPwd}
            onChange={setPayPwd}
            type="password"
            placeholder="รหัสผ่านถอน"
          />
        </FormField>

        {tab === 'bank' ? (
          <>
            <div className="mb-1.5 mt-5 font-bold">เลือกบัญชีธนาคาร</div>
            {banks.length === 0 ? (
              <button
                type="button"
                className="my-5 w-full text-center text-[#86aeff]"
                onClick={() => onNavigate('bind-bank')}
              >
                + เพิ่มบัญชีธนาคาร
              </button>
            ) : (
              banks.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBank(i)}
                  className={cn(
                    'bor mb-1.5 flex w-full items-center justify-between rounded-md border border-[#ccc] p-5 text-left',
                    selectedBank === i && 'border-[#86aeff]',
                  )}
                >
                  <div>
                    <div>{b.bankUsername}</div>
                    <div className="my-4">{b.bankName}</div>
                    <div>{b.bankCard}</div>
                  </div>
                  {selectedBank === i && <span className="text-[#86aeff]">✓</span>}
                </button>
              ))
            )}
          </>
        ) : (
          <>
            <div className="mb-1.5 mt-5 font-bold">เลือกกระเป๋าคริปโต</div>
            {wallets.length === 0 ? (
              <button
                type="button"
                className="my-5 w-full text-center text-[#86aeff]"
                onClick={() => onNavigate('virtual-add')}
              >
                + เพิ่มกระเป๋าคริปโต
              </button>
            ) : (
              wallets.map((w, i) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWallet(i)}
                  className={cn(
                    'bor mb-1.5 flex w-full items-center justify-between rounded-md border border-[#ccc] p-5 text-left',
                    selectedWallet === i && 'border-[#86aeff]',
                  )}
                >
                  <div>
                    <div className="mb-4">{w.remark}</div>
                    <div className="break-all">{w.address}</div>
                  </div>
                  {selectedWallet === i && <span className="text-[#86aeff]">✓</span>}
                </button>
              ))
            )}
          </>
        )}

        {config && (
          <p className="mt-2 text-xs text-[#888]">
            ถอนขั้นต่ำ {config.withdrawMin} บาท สูงสุด {config.withdrawMax} บาท
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {(tab === 'bank' ? banks.length : wallets.length) > 0 && (
          <PrimaryButton className="mt-5" onClick={handleSubmit}>
            {loading ? 'กำลังดำเนินการ...' : 'ยืนยันถอนเงิน'}
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}
