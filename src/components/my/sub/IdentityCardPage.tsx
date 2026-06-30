import { useState } from 'react'
import { GreenButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { submitIdentity } from '@/services/wallet'

interface IdentityCardPageProps {
  onBack: () => void
}

const inputClass =
  'mb-4 h-11 w-full rounded-xl border border-[#ebedf0] bg-[#fafbfc] px-3 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20'

export function IdentityCardPage({ onBack }: IdentityCardPageProps) {
  const [realName, setRealName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!realName.trim() || !idNumber.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setLoading(true)
    setError('')
    try {
      await submitIdentity(realName.trim(), idNumber.trim())
      setDone(true)
      setTimeout(onBack, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title="ยืนยันตัวตน" variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <p className="mb-3 text-xs text-[#969799]">
          กรอกชื่อ-นามสกุลและเลขบัตรประชาชนเพื่อยืนยันตัวตน (รอเจ้าหน้าที่ตรวจสอบ)
        </p>
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">ชื่อ-นามสกุล</label>
        <input
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
          placeholder="ชื่อ-นามสกุลตามบัตร"
          className={inputClass}
        />
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">เลขบัตรประชาชน</label>
        <input
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder="เลขบัตรประชาชน"
          className={inputClass}
        />
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        {done && <p className="mb-2 text-sm text-[#2e7d32]">ส่งคำขอยืนยันตัวตนแล้ว</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังส่ง...' : 'ยืนยัน'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
