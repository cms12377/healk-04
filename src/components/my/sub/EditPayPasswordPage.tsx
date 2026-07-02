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
  const { user, refreshUser } = useAuth()
  const hasPayPassword = !!user?.hasPayPassword
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
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
      setSuccess(true)
      setPwd('')
      setConfirm('')
      setTimeout(onBack, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  if (hasPayPassword) {
    return (
      <SubPageShell title="รหัสผ่านถอน" variant="white" onBack={onBack}>
        <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
          <div className="mb-4 flex items-center justify-between rounded-xl bg-[#f5f7fa] px-3 py-3 ring-1 ring-[#ebedf0]">
            <span className="text-xs font-medium text-[#969799]">รหัสผ่านถอนปัจจุบัน</span>
            <span
              className="font-mono text-base tracking-[0.35em] text-[#2c3345]"
              aria-label="รหัสผ่านถอนที่ตั้งไว้แล้ว"
            >
              ******
            </span>
          </div>
          <p className="rounded-xl bg-[#eef2ff] px-3 py-3 text-xs leading-relaxed text-[#4e72f3]">
            ตั้งรหัสผ่านถอนแล้ว — ไม่สามารถแก้ไขเองได้
            <br />
            หากลืมรหัสหรือต้องการเปลี่ยน กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </SubCard>
      </SubPageShell>
    )
  }

  return (
    <SubPageShell title="ตั้งรหัสผ่านถอน" variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <p className="mb-3 font-semibold">ตั้งรหัสผ่านถอน (6 หลัก)</p>
        <p className="mb-4 text-xs leading-relaxed text-[#969799]">
          ตั้งได้ครั้งเดียว — หลังบันทึกแล้วไม่สามารถแก้ไขเองได้
        </p>
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
        {success && <p className="mb-2 text-sm text-[#2e7d32]">ตั้งรหัสผ่านถอนสำเร็จ</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
