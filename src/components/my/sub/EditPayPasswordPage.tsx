import { useState } from 'react'
import { GreenButton, PageNavBar } from '@/components/common/PageNavBar'
import { setPayPassword } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'

interface EditPayPasswordPageProps {
  onBack: () => void
}

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
    <div className="min-h-[100vh] bg-white">
      <PageNavBar title="รหัสผ่านถอน" variant="white" showBack onBack={onBack} />
      <div className="p-5 text-sm text-[#333]">
        <div className="mb-2 font-bold">ตั้งรหัสผ่านถอน</div>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="รหัสผ่านถอน (อย่างน้อย 6 ตัว)"
          className="mb-4 h-10 w-full rounded border border-[#ddd] px-3"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="ยืนยันรหัสผ่านถอน"
          className="mb-4 h-10 w-full rounded border border-[#ddd] px-3"
        />
        {error && <p className="mb-2 text-red-500">{error}</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </div>
    </div>
  )
}
