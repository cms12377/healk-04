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

export function EditPayPasswordPage({ onBack }: EditPayPasswordPageProps) {
  const { refreshUser } = useAuth()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!pwd || pwd.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัว')
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
        <p className="mb-3 font-semibold">ตั้งรหัสผ่านถอน</p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="รหัสผ่านถอน (อย่างน้อย 6 ตัว)"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
