import { useState } from 'react'
import { GreenButton, PageNavBar } from '@/components/common/PageNavBar'
import { changeLoginPassword } from '@/services/api'

interface EditPasswordPageProps {
  onBack: () => void
}

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
    <div className="min-h-[100vh] bg-white pt-[60px] text-[#333]">
      <PageNavBar title="เปลี่ยนรหัสผ่าน" variant="white" showBack onBack={onBack} />
      <div className="flex items-center justify-center py-4 text-xl font-medium">
        เปลี่ยนรหัสผ่าน
      </div>
      <div className="px-4 pb-6">
        <div className="mb-5 pl-2.5 text-sm">รหัสผ่านเดิม</div>
        <input
          type="password"
          value={oldPwd}
          onChange={(e) => setOldPwd(e.target.value)}
          placeholder="รหัสผ่านเดิม"
          className="input mb-5 h-[35px] w-full rounded border border-[#ddd] px-2.5 text-xs"
        />
        <div className="mb-5 pl-2.5 text-sm">รหัสผ่านใหม่</div>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          placeholder="รหัสผ่านใหม่"
          className="input mb-5 h-[35px] w-full rounded border border-[#ddd] px-2.5 text-xs"
        />
        <div className="mb-1 pl-2.5 text-sm">ยืนยันรหัสผ่านใหม่</div>
        <input
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          placeholder="ยืนยันรหัสผ่านใหม่"
          className="input mb-2 h-[35px] w-full rounded border border-[#ddd] px-2.5 text-xs"
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600">เปลี่ยนรหัสผ่านสำเร็จ</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
        </GreenButton>
      </div>
    </div>
  )
}
