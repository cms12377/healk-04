import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PageNavBar,
  PrimaryButton,
} from '@/components/common/PageNavBar'
import { submitDeposit } from '@/services/api'
import { getTransferBankInfo } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'
import type { TransferBankInfo } from '@/types'

interface TransferBankPageProps {
  amount: string
  onBack: () => void
  onSuccess: () => void
}

export function TransferBankPage({ amount, onBack, onSuccess }: TransferBankPageProps) {
  const { refreshUser } = useAuth()
  const [info, setInfo] = useState<TransferBankInfo | null>(null)
  const [payerName, setPayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void getTransferBankInfo().then(setInfo).catch(() => setInfo(null))
  }, [])

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('คัดลอกแล้ว')
  }

  const submit = async () => {
    if (!payerName.trim()) {
      setMessage('กรุณากรอกชื่อผู้โอน')
      return
    }
    setLoading(true)
    try {
      await submitDeposit(Number(amount), 'bank')
      await refreshUser()
      onSuccess()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <PageNavBar title="โอนเข้าบัญชี" variant="white" showBack onBack={onBack} />
        <p className="p-5 text-center text-sm text-[#888]">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar title="โอนเข้าบัญชี" variant="white" showBack onBack={onBack} />

      <div className="p-5 text-sm text-black">
        <p className="text-center">จำนวนเงิน</p>
        <h6 className="my-2 text-center text-[25px] text-[#e02020]">
          ฿{Number(amount).toLocaleString()}
        </h6>
        <p className="mb-2">โอนเข้าบัญชีด้านล่าง</p>

        <div className="rounded-md bg-white p-2.5">
          {[
            ['ผู้รับ', info.bankUsername],
            ['เลขบัญชี', info.bankCard],
            ['ธนาคาร', info.bankName],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span>{label}</span>
              <div className="flex items-center gap-2">
                <span>{value}</span>
                <button type="button" onClick={() => void copy(value)} className="text-[#427ffa]">
                  คัดลอก
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="my-2.5">กรอกข้อมูลการโอน</p>
        <div className="rounded-md bg-white p-2.5">
          <FormField label="ชื่อผู้โอน">
            <InputBox
              value={payerName}
              onChange={setPayerName}
              placeholder="กรอกชื่อผู้โอน"
            />
          </FormField>
        </div>

        {info.notice && (
          <p className="py-2.5 text-[11px] text-red-500">{info.notice}</p>
        )}

        {message && <p className="text-center text-sm text-[#427ffa]">{message}</p>}

        <PrimaryButton className="mt-5" onClick={submit}>
          {loading ? 'กำลังส่ง...' : 'ยืนยันการชำระ'}
        </PrimaryButton>
      </div>
    </div>
  )
}
