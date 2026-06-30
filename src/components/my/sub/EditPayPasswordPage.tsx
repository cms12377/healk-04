import { useState } from 'react'
import { GreenButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { setPayPassword } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'

interface EditPayPasswordPageProps {
  onBack: () => void
}

const inputClass =
  'mb-4 h-11 w-full rounded-xl border border-[#ebedf0] bg-[#fafbfc] px-3 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function EditPayPasswordPage({ onBack }: EditPayPasswordPageProps) {
  const { refreshUser } = useAuth()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!/^\d{6}$/.test(pwd)) {
      setError('รหัสผ่านถอนต้องเป็นตัวเลข 6 หลัก')
      return
    }
    if (pwd !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    setLoading(true)
    setError('')
    try {
      await setPayPassword(pwd)
      await refreshUser()
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title="รหัสผ่านถอน" variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <p className="mb-3 font-semibold">ตั้งรหัสผ่านถอน (6 หลัก)</p>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pwd}
          onChange={(e) => setPwd(digitsOnly(e.target.value))}
          placeholder="รหัสผ่านถอน 6 หลัก"
          className={inputClass}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(digitsOnly(e.target.value))}
          placeholder="ยืนยันรหัสผ่านถอน"
          className={inputClass}
        />
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
