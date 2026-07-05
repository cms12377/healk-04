import { useEffect, useState } from 'react'
import {
  FormField,
  InputBox,
  PrimaryButton,
} from '@/components/common/PageNavBar'
import { ListSkeleton, SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { encodeDepositProof, uploadDepositProofSlip } from '@/lib/memberUploads'
import { submitDeposit } from '@/services/api'
import { getTransferBankInfo } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'
import type { TransferBankInfo } from '@/types'

interface TransferBankPageProps {
  amount: string
  channelId?: string
  onBack: () => void
  onSuccess: () => void
}

export function TransferBankPage({
  amount,
  channelId,
  onBack,
  onSuccess,
}: TransferBankPageProps) {
  const { user } = useAuth()
  const blocked = user?.isBlocked ?? false
  const [info, setInfo] = useState<TransferBankInfo | null>(null)
  const [payerName, setPayerName] = useState('')
  const [slipPreview, setSlipPreview] = useState('')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [transferAt, setTransferAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [loading, setLoading] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    void getTransferBankInfo(channelId)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoadingInfo(false))
  }, [channelId])

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('คัดลอกแล้ว')
  }

  const submit = async () => {
    if (blocked) return
    if (!payerName.trim()) {
      setMessage('กรุณากรอกชื่อผู้โอน')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      let slipUrl: string | undefined
      if (slipFile) {
        slipUrl = await uploadDepositProofSlip(slipFile)
      }
      await submitDeposit(Number(amount), 'bank', {
        payerName: payerName.trim(),
        proofImage: encodeDepositProof(transferAt, slipUrl),
        channelId,
      })
      setSubmitted(true)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const onSlipPick = (file: File | undefined) => {
    if (!file) return
    setSlipFile(file)
    const reader = new FileReader()
    reader.onload = () => setSlipPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (loadingInfo) {
    return (
      <SubPageShell title="โอนเข้าบัญชี" variant="white" onBack={onBack}>
        <ListSkeleton rows={3} />
      </SubPageShell>
    )
  }

  if (!info) {
    return (
      <SubPageShell title="โอนเข้าบัญชี" variant="white" onBack={onBack}>
        <p className="p-5 text-center text-sm text-[#969799]">โหลดข้อมูลไม่สำเร็จ</p>
      </SubPageShell>
    )
  }

  if (submitted) {
    return (
      <SubPageShell title="โอนเข้าบัญชี" variant="white" onBack={onSuccess}>
        <div className="mx-3 mt-8 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-[#2c3345]">ส่งคำขอฝากเงินแล้ว</p>
          <p className="mt-2 text-sm text-[#969799]">
            รอเจ้าหน้าที่ตรวจสอบ ยอดจะอัปเดตหลังอนุมัติ
          </p>
          <PrimaryButton className="mt-5" onClick={onSuccess}>
            ตกลง
          </PrimaryButton>
        </div>
      </SubPageShell>
    )
  }

  return (
    <SubPageShell title="โอนเข้าบัญชี" variant="white" onBack={onBack}>
      <div className="mx-3 mt-3 text-center">
        <p className="text-sm text-[#969799]">จำนวนเงิน</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-[#e53935]">
          ฿{Number(amount).toLocaleString()}
        </p>
      </div>

      <SubCard className="mt-3 p-4 text-sm">
        <p className="mb-3 font-medium text-[#2c3345]">โอนเข้าบัญชีด้านล่าง</p>
        {[
          ['ผู้รับ', info.bankUsername],
          ['เลขบัญชี', info.bankCard],
          ['ธนาคาร', info.bankName],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"
          >
            <span className="text-[#969799]">{label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#2c3345]">{value}</span>
              <button
                type="button"
                onClick={() => void copy(value)}
                className="text-xs font-semibold text-[#4e72f3]"
              >
                คัดลอก
              </button>
            </div>
          </div>
        ))}
      </SubCard>

      <SubCard className="mt-3 p-4 text-sm">
        <FormField label="ชื่อผู้โอน">
          <InputBox value={payerName} onChange={setPayerName} placeholder="กรอกชื่อผู้โอน" disabled={blocked} />
        </FormField>
        <FormField label="เวลาโอน">
          <input
            type="datetime-local"
            value={transferAt}
            onChange={(e) => setTransferAt(e.target.value)}
            className="h-10 w-full rounded-md bg-[#f5f5f9] px-3 text-sm outline-none"
          />
        </FormField>
        <FormField label="รูปสลิป (แนะนำ)">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onSlipPick(e.target.files?.[0])}
            className="w-full text-sm text-[#646566]"
          />
          {slipPreview && (
            <img
              src={slipPreview}
              alt="ตัวอย่างสลิป"
              className="mt-2 max-h-40 rounded-lg border border-[#eee] object-contain"
            />
          )}
        </FormField>
      </SubCard>

      {info.notice && (
        <p className="mx-3 mt-3 text-xs text-[#e53935]">{info.notice}</p>
      )}

      {message && (
        <p className="mt-3 text-center text-sm text-[#4e72f3]">{message}</p>
      )}

      <div className="mx-3 mt-4">
        <PrimaryButton onClick={submit} disabled={blocked}>
          {loading ? 'กำลังส่ง...' : 'ยืนยันการชำระ'}
        </PrimaryButton>
      </div>
    </SubPageShell>
  )
}
