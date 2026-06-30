import { useState } from 'react'
import { GreenButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { changeLoginPassword } from '@/services/api'

interface EditPasswordPageProps {
  onBack: () => void
}

const inputClass =
  'mb-4 h-11 w-full rounded-xl border border-[#ebedf0] bg-[#fafbfc] px-3 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20'

export function EditPasswordPage({ onBack }: EditPasswordPageProps) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (newPwd !== confirmPwd) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน')
      return
    }
    setLoading(true)
    setError('')
    try {
      await changeLoginPassword(oldPwd, newPwd)
      setSuccess(true)
      setTimeout(onBack, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title="เปลี่ยนรหัสผ่าน" variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">รหัสผ่านเดิม</label>
        <input
          type="password"
          value={oldPwd}
          onChange={(e) => setOldPwd(e.target.value)}
          placeholder="รหัสผ่านเดิม"
          className={inputClass}
        />
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">รหัสผ่านใหม่</label>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          placeholder="รหัสผ่านใหม่"
          className={inputClass}
        />
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">ยืนยันรหัสผ่านใหม่</label>
        <input
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          placeholder="ยืนยันรหัสผ่านใหม่"
          className={inputClass}
        />
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        {success && <p className="mb-2 text-sm text-[#2e7d32]">เปลี่ยนรหัสผ่านสำเร็จ</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
