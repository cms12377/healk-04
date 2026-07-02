import { useState } from 'react'
import { SubPageShell } from '@/components/my/sub/SubPageShell'
import { useAuth } from '@/context/AuthContext'
import { getThaiBankById, THAI_BANKS } from '@/lib/thaiBanks'
import { addBankCard } from '@/services/wallet'
import type { SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface BindBankPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

function digitsOnly(value: string, maxLen = 20): string {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

const fieldLabelClass = 'mb-1 mt-2.5 pl-4 text-sm font-semibold text-black'
const inputClass =
  'mb-1 h-[30px] w-full rounded-full border border-[#ccc] px-2.5 text-[12.5px] outline-none focus:border-[#86aeff]'

export function BindBankPage({ onBack, onNavigate }: BindBankPageProps) {
  const { user } = useAuth()
  const [bankId, setBankId] = useState('')
  const [bankUsername, setBankUsername] = useState('')
  const [bankCard, setBankCard] = useState('')
  const [error, setError] = useState('')
  const [showPayPwdDialog, setShowPayPwdDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user?.hasPayPassword) {
      setShowPayPwdDialog(true)
      return
    }

    const bank = getThaiBankById(bankId)
    if (!bank || !bankUsername.trim() || !bankCard.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (bankCard.length < 8) {
      setError('เลขบัญชีต้องมีอย่างน้อย 8 หลัก')
      return
    }

    setLoading(true)
    setError('')
    try {
      await addBankCard({
        bankName: bank.name,
        bankUsername: bankUsername.trim(),
        bankCard,
      })
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title="ผูกบัตร" variant="white" onBack={onBack}>
      <div className="mx-auto w-full max-w-[500px] p-[15px] text-[13px] text-[#333]">
        <div className={fieldLabelClass}>ชื่อ</div>
        <input
          className={inputClass}
          value={bankUsername}
          onChange={(e) => setBankUsername(e.target.value)}
          placeholder="กรอกชื่อ"
          type="text"
        />

        <div className={fieldLabelClass}>หมายเลขบัตร</div>
        <input
          className={inputClass}
          value={bankCard}
          onChange={(e) => setBankCard(digitsOnly(e.target.value))}
          placeholder="กรอกหมายเลขบัตร"
          type="text"
          inputMode="numeric"
        />

        <div className={fieldLabelClass}>ชื่อธนาคาร</div>
        <select
          className={cn(inputClass, 'bg-white py-0')}
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
        >
          <option value="">เลือกธนาคาร</option>
          {THAI_BANKS.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>

        {error && <p className="mt-2 text-sm text-[#e53935]">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSubmit()}
          className="mt-4 flex h-10 w-full items-center justify-center rounded-full bg-[#6f9eff] text-sm text-white disabled:opacity-60"
        >
          {loading ? 'กำลังบันทึก...' : 'ผูก'}
        </button>
      </div>

      {showPayPwdDialog && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/45 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg">
            <p className="text-sm font-medium text-[#333]">กรุณาตั้งรหัสเงินทุนก่อน!</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPayPwdDialog(false)}
                className="flex-1 rounded-full border border-[#ddd] py-2 text-sm text-[#666]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPayPwdDialog(false)
                  onNavigate('edit-pay-password')
                }}
                className="flex-1 rounded-full bg-[#6f9eff] py-2 text-sm text-white"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </SubPageShell>
  )
}
