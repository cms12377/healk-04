import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

interface LoginPageProps {
  onBack: () => void
  onRegisterClick: () => void
  onSuccess: () => void
}

export function LoginPage({ onBack, onRegisterClick, onSuccess }: LoginPageProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#3880e5] to-[#86a7ff] px-6 pb-10 pt-16">
      <button type="button" onClick={onBack} className="mb-8 text-white">
        ← กลับ
      </button>
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex justify-center">
          <img src="/assets/logo.jpg" alt="logo" className="h-16 w-16 rounded-full object-cover" />
        </div>
        <h1 className="mb-6 text-center text-xl font-bold text-[#333]">เข้าสู่ระบบ</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ชื่อผู้ใช้"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#3880e5]"
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#3880e5]"
          />
          {error && <p className="text-center text-xs text-[#ee0a24]">{error}</p>}
          {!isSupabaseConfigured && (
            <p className="text-center text-xs text-[#ee0a24]">
              ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#148164] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <button
          type="button"
          onClick={onRegisterClick}
          className="mt-4 w-full text-center text-sm text-[#3880e5]"
        >
          ยังไม่มีบัญชี? สมัครสมาชิก
        </button>
      </div>
    </div>
  )
}

interface RegisterPageProps {
  onBack: () => void
  onLoginClick: () => void
  onSuccess: () => void
}

export function RegisterPage({ onBack, onLoginClick, onSuccess }: RegisterPageProps) {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(username, password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#3880e5] to-[#86a7ff] px-6 pb-10 pt-16">
      <button type="button" onClick={onBack} className="mb-8 text-white">
        ← กลับ
      </button>
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-center text-xl font-bold text-[#333]">สมัครสมาชิก</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ชื่อผู้ใช้"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#3880e5]"
          />
          <input
            type="password"
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#3880e5]"
          />
          <input
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#3880e5]"
          />
          {error && <p className="text-center text-xs text-[#ee0a24]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#148164] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>
        <button
          type="button"
          onClick={onLoginClick}
          className="mt-4 w-full text-center text-sm text-[#3880e5]"
        >
          มีบัญชีแล้ว? เข้าสู่ระบบ
        </button>
      </div>
    </div>
  )
}
