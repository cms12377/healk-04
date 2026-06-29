import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PageNavBar,
  PrimaryButton,
  TabBar,
} from '@/components/common/PageNavBar'
import { getRechargeChannels } from '@/services/api'
import type { RechargeChannel, SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface RechargePageProps {
  onBack: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
}

export function RechargePage({ onBack, onNavigate }: RechargePageProps) {
  const [channels, setChannels] = useState<RechargeChannel[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [amount, setAmount] = useState('500')
  const [selectedIdx, setSelectedIdx] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    void getRechargeChannels().then((c) => {
      setChannels(c)
      if (c[0]) {
        setActiveTab(c[0].id)
        setAmount(c[0].quickAmounts[1] ?? '500')
      }
    })
  }, [])

  const channel = channels.find((c) => c.id === activeTab) ?? channels[0]

  const handleSubmit = () => {
    const num = Number(amount)
    if (!num || num <= 0) {
      setError('กรุณากรอกจำนวนเงิน')
      return
    }
    setError('')
    if (channel?.type === 'bank') {
      onNavigate('transfer-bank', { amount: String(num) })
    } else {
      onNavigate('virtual-recharge', { amount: String(num) })
    }
  }

  if (!channel) {
    return (
      <div className="min-h-[100vh] bg-[#f5f5f5]">
        <PageNavBar title="ฝากเงิน" showBack onBack={onBack} />
        <p className="p-5 text-center text-sm text-[#888]">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ฝากเงิน" showBack onBack={onBack} />
      <TabBar
        tabs={channels.map((c) => ({ value: c.id, label: c.name }))}
        active={activeTab}
        onChange={setActiveTab}
      />
      <div className="bg-white p-5 text-sm text-[#333]">
        <FormField label={channel.type === 'bank' ? 'จำนวนเงิน' : 'จำนวน'}>
          <InputBox value={amount} onChange={setAmount} prefix="฿" type="number" />
        </FormField>
        <div className="my-5 grid grid-cols-3 gap-5">
          {channel.quickAmounts.map((val, i) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setAmount(val)
                setSelectedIdx(i)
              }}
              className={cn(
                'flex h-10 items-center justify-center rounded-full border border-[#ccc]',
                selectedIdx === i && 'bg-[#86aeff] text-white',
              )}
            >
              {val}
            </button>
          ))}
        </div>
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <PrimaryButton onClick={handleSubmit}>ถัดไป</PrimaryButton>
      </div>
    </div>
  )
}
