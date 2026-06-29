import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PageNavBar,
  PrimaryButton,
} from '@/components/common/PageNavBar'
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
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar title="ฝากคริปโต" variant="white" showBack onBack={onBack} />

      <div className="p-5 text-sm text-black">
        <p className="text-center">จำนวน</p>
        <h6 className="my-2 text-center text-[25px] text-[#e02020]">{amount}</h6>

        <p className="mb-2">ที่อยู่กระเป๋า</p>
        <div className="rounded-md bg-white p-2.5">
          <div className="flex items-center justify-between py-2.5">
            <span>USDT (TRC20)</span>
            <div className="flex items-center gap-2">
              <span className="max-w-[160px] truncate text-xs">{address || '...'}</span>
              {address && (
                <button type="button" onClick={() => void copy(address)} className="text-[#427ffa]">
                  คัดลอก
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="my-2.5">กรอกข้อมูลการโอน</p>
        <div className="rounded-md bg-white p-2.5">
          <FormField label="Hash / หมายเหตุ">
            <InputBox value={txHash} onChange={setTxHash} placeholder="กรอก Hash" />
          </FormField>
        </div>

        {notice && (
          <p className="py-2.5 text-[11px] text-red-500">{notice}</p>
        )}

        {message && <p className="text-center text-sm text-[#427ffa]">{message}</p>}

        <PrimaryButton className="mt-5" onClick={submit}>
          {loading ? 'กำลังส่ง...' : 'ยืนยันการชำระ'}
        </PrimaryButton>
      </div>
    </div>
  )
}
