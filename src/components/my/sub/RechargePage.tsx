import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PrimaryButton,
  TabBar,
} from '@/components/common/PageNavBar'
import { ListSkeleton, SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { getRechargeChannels } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import type { RechargeChannel, SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface RechargePageProps {
  onBack: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
}

export function RechargePage({ onBack, onNavigate }: RechargePageProps) {
  const { user } = useAuth()
  const blocked = user?.isBlocked ?? false
  const [channels, setChannels] = useState<RechargeChannel[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [amount, setAmount] = useState('500')
  const [selectedIdx, setSelectedIdx] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getRechargeChannels()
      .then((c) => {
        setChannels(c)
        if (c[0]) {
          setActiveTab(c[0].id)
          setAmount(c[0].quickAmounts[1] ?? '500')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const channel = channels.find((c) => c.id === activeTab) ?? channels[0]

  const handleSubmit = () => {
    if (blocked) return
    const num = Number(amount)
    if (!num || num <= 0) {
      setError('กรุณากรอกจำนวนเงิน')
      return
    }
    setError('')
    if (channel?.type === 'bank') {
      onNavigate('transfer-bank', { amount: String(num), id: channel.id })
    } else {
      onNavigate('virtual-recharge', { amount: String(num), id: channel.id })
    }
  }

  if (loading) {
    return (
      <SubPageShell title="ฝากเงิน" onBack={onBack}>
        <ListSkeleton rows={3} />
      </SubPageShell>
    )
  }

  if (!channel) {
    return (
      <SubPageShell title="ฝากเงิน" onBack={onBack}>
        <p className="p-5 text-center text-sm text-[#969799]">ไม่พบช่องทางฝากเงิน</p>
      </SubPageShell>
    )
  }

  return (
    <SubPageShell title="ฝากเงิน" onBack={onBack}>
      <TabBar
        tabs={channels.map((c) => ({ value: c.id, label: c.name }))}
        active={activeTab}
        onChange={setActiveTab}
        variant="pill"
      />
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <FormField label={channel.type === 'bank' ? 'จำนวนเงิน' : 'จำนวน'}>
          <InputBox value={amount} onChange={setAmount} prefix="฿" type="number" />
        </FormField>
        <div className="my-5 grid grid-cols-3 gap-3">
          {channel.quickAmounts.map((val, i) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setAmount(val)
                setSelectedIdx(i)
              }}
              className={cn(
                'flex h-10 items-center justify-center rounded-full border text-sm font-medium transition',
                selectedIdx === i
                  ? 'border-[#4e72f3] bg-[#4e72f3] text-white shadow-sm'
                  : 'border-[#ebedf0] bg-white text-[#535867] hover:bg-[#f8faff]',
              )}
            >
              {val}
            </button>
          ))}
        </div>
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        <PrimaryButton onClick={handleSubmit} disabled={blocked}>ถัดไป</PrimaryButton>
      </SubCard>
    </SubPageShell>
  )
}
