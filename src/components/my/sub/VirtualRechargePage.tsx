import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PrimaryButton,
} from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { submitDeposit } from '@/services/api'
import { getCryptoDepositInfo } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'

interface VirtualRechargePageProps {
  amount: string
  onBack: () => void
  onSuccess: () => void
}

export function VirtualRechargePage({ amount, onBack, onSuccess }: VirtualRechargePageProps) {
  const { refreshUser } = useAuth()
  const [address, setAddress] = useState('')
  const [notice, setNotice] = useState<string>()
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void getCryptoDepositInfo().then((info) => {
      setAddress(info.address)
      setNotice(info.notice)
    })
  }, [])

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('คัดลอกแล้ว')
  }

  const submit = async () => {
    if (!txHash.trim()) {
      setMessage('กรุณากรอก Hash การโอน')
      return
    }
    setLoading(true)
    try {
      await submitDeposit(Number(amount), 'crypto')
      await refreshUser()
      onSuccess()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title="ฝากคริปโต" variant="white" onBack={onBack}>
      <div className="mx-3 mt-3 text-center">
        <p className="text-sm text-[#969799]">จำนวน</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-[#e53935]">{amount}</p>
      </div>

      {address && (
        <div className="mx-auto mt-4 flex justify-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(address)}`}
            alt="QR กระเป๋า"
            className="rounded-lg border border-[#eee] bg-white p-2"
            width={160}
            height={160}
          />
        </div>
      )}

      <SubCard className="mt-3 p-4 text-sm">
        <p className="mb-2 font-medium text-[#2c3345]">ที่อยู่กระเป๋า</p>
        <div className="flex items-center justify-between gap-2 py-2">
          <span className="text-[#969799]">USDT (TRC20)</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="max-w-[160px] truncate text-xs font-mono">{address || '...'}</span>
            {address && (
              <button
                type="button"
                onClick={() => void copy(address)}
                className="shrink-0 text-xs font-semibold text-[#4e72f3]"
              >
                คัดลอก
              </button>
            )}
          </div>
        </div>
      </SubCard>

      <SubCard className="mt-3 p-4 text-sm">
        <FormField label="Hash / หมายเหตุ">
          <InputBox value={txHash} onChange={setTxHash} placeholder="กรอก Hash" />
        </FormField>
      </SubCard>

      {notice && <p className="mx-3 mt-3 text-xs text-[#e53935]">{notice}</p>}
      {message && <p className="mt-3 text-center text-sm text-[#4e72f3]">{message}</p>}

      <div className="mx-3 mt-4">
        <PrimaryButton onClick={submit}>
          {loading ? 'กำลังส่ง...' : 'ยืนยันการชำระ'}
        </PrimaryButton>
      </div>
    </SubPageShell>
  )
}
