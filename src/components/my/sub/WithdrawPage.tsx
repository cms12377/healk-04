import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PrimaryButton,
  TabBar,
} from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { submitWithdraw } from '@/services/api'
import { getBankCards, getCryptoWallets } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'
import type { BankCard, CryptoWallet, SubPage } from '@/types'
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
  const [banks, setBanks] = useState<BankCard[]>([])
  const [wallets, setWallets] = useState<CryptoWallet[]>([])
  const [selectedBank, setSelectedBank] = useState(0)
  const [selectedWallet, setSelectedWallet] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const [bankList, walletList] = await Promise.all([
          getBankCards(),
          getCryptoWallets(),
        ])
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
    <SubPageShell
      title="ถอนเงิน"
      onBack={onBack}
      rightLabel="บันทึก"
      onRightClick={onOpenNotes}
    >
      <TabBar
        tabs={[
          { value: 'bank', label: 'ถอนผ่านธนาคาร' },
          { value: 'crypto', label: 'ถอนคริปโต' },
        ]}
        active={tab}
        onChange={setTab}
        variant="pill"
      />
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <FormField label="จำนวนเงิน">
          <div className="flex gap-2">
            <InputBox value={amount} onChange={setAmount} prefix="฿" type="number" />
            <button
              type="button"
              onClick={fillMax}
              className="shrink-0 rounded-lg bg-[#eef2ff] px-3 text-xs font-semibold text-[#4e72f3]"
            >
              ทั้งหมด
            </button>
          </div>
        </FormField>

        {tab === 'bank' ? (
          banks.length === 0 ? (
            <p className="text-sm text-[#969799]">ยังไม่มีบัญชีธนาคาร</p>
          ) : (
            <FormField label="บัญชีรับเงิน">
              <div className="space-y-2">
                {banks.map((card, i) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedBank(i)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition',
                      selectedBank === i
                        ? 'border-[#4e72f3] bg-[#eef2ff]'
                        : 'border-[#ebedf0] bg-[#fafbfc]',
                    )}
                  >
                    <div className="font-medium">{card.bankName}</div>
                    <div className="text-xs text-[#969799]">{card.bankCard}</div>
                  </button>
                ))}
              </div>
            </FormField>
          )
        ) : wallets.length === 0 ? (
          <p className="text-sm text-[#969799]">ยังไม่มีกระเป๋าคริปโต</p>
        ) : (
          <FormField label="กระเป๋ารับเงิน">
            <div className="space-y-2">
              {wallets.map((w, i) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWallet(i)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition',
                    selectedWallet === i
                      ? 'border-[#4e72f3] bg-[#eef2ff]'
                      : 'border-[#ebedf0] bg-[#fafbfc]',
                  )}
                >
                  <div className="font-medium">{w.remark}</div>
                  <div className="truncate text-xs text-[#969799]">{w.address}</div>
                </button>
              ))}
            </div>
          </FormField>
        )}

        <FormField label="รหัสผ่านถอน">
          <InputBox value={payPwd} onChange={setPayPwd} type="password" placeholder="••••••" />
        </FormField>

        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}

        <PrimaryButton onClick={() => void handleSubmit()}>
          {loading ? 'กำลังส่ง...' : 'ยืนยันถอนเงิน'}
        </PrimaryButton>
      </SubCard>
    </SubPageShell>
  )
}
