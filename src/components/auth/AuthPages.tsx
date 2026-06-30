import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ASSETS } from '@/constants/assets'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchServiceConfig } from '@/services/api'
import {
  AuthField,
  AuthNavBar,
  AuthPrimaryButton,
  AuthQuickActions,
  AuthSplit,
  AUTH_CARD_CLASS,
  DESKTOP_SITE_URL,
  LockIcon,
  PhoneIcon,
  UserIcon,
} from '@/components/auth/authShared'

interface LoginPageProps {
  onBack: () => void
  onRegisterClick: () => void
  onSuccess: () => void
  onLanguageClick?: () => void
  onServiceClick?: () => void
}

export function LoginPage({
  onBack,
  onRegisterClick,
  onSuccess,
  onLanguageClick,
  onServiceClick,
}: LoginPageProps) {
  const { login } = useAuth()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [serviceUrl, setServiceUrl] = useState('')

  useEffect(() => {
    fetchServiceConfig()
      .then((cfg) => setServiceUrl(cfg.serviceUrl))
      .catch(() => setServiceUrl('/service-frame.html'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account.trim() || !password) {
      setError('กรุณากรอกบัญชีและรหัสผ่าน')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(account.trim(), password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
  }

  const openSupport = () => {
    if (onServiceClick) {
      onServiceClick()
      return
    }
    if (serviceUrl) window.open(serviceUrl, '_blank')
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <AuthNavBar title="เข้าสู่ระบบ" onBack={onBack} onLanguageClick={onLanguageClick} />

      <div className="px-3 pt-4">
        <form className={`${AUTH_CARD_CLASS} space-y-2.5`} onSubmit={handleSubmit}>
          <AuthField
            icon={<UserIcon />}
            placeholder="กรุณากรอกบัญชี"
            value={account}
            onChange={setAccount}
          />
          <AuthField
            icon={<LockIcon />}
            placeholder="กรุณากรอกรหัสผ่าน"
            value={password}
            onChange={setPassword}
            showToggle
          />

          {error && <p className="mt-2 text-center text-xs text-[#ee0a24]">{error}</p>}
          {!isSupabaseConfigured && (
            <p className="mt-2 text-center text-xs text-[#ee0a24]">
              ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local
            </p>
          )}

          <AuthPrimaryButton type="submit" loading={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </AuthPrimaryButton>

          <div className="mt-2.5 flex items-center justify-end text-[16px]">
            <button
              type="button"
              onClick={openSupport}
              className="flex items-center gap-1.5 text-[#888]"
            >
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px] text-[#8aa9ff]" aria-hidden>
                <path
                  d="M4 13v3a3 3 0 0 0 3 3h2v-4H7a3 3 0 0 1-3-3v-1a8 8 0 0 1 16 0v1a3 3 0 0 1-3 3h-2v4h2a3 3 0 0 0 3-3v-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              ติดต่อฝ่ายบริการ
            </button>
          </div>

          <AuthSplit />
          <AuthQuickActions
            onRegister={onRegisterClick}
            onDesktop={() => {
              window.open(DESKTOP_SITE_URL, '_blank')
            }}
          />
        </form>
      </div>
    </div>
  )
}

interface RegisterPageProps {
  onBack: () => void
  onLoginClick: () => void
  onSuccess: () => void
  onLanguageClick?: () => void
}

export function RegisterPage({
  onBack,
  onLoginClick,
  onSuccess,
  onLanguageClick,
}: RegisterPageProps) {
  const { register } = useAuth()
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !username.trim() || !password || !confirm) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    if (password !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    if (password.length < 6 || password.length > 20) {
      setError('รหัสผ่านต้องมี 6-20 ตัวอักษร')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(username.trim(), password, phone.trim())
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-[100dvh] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${ASSETS.loginBg})` }}
    >
      <AuthNavBar title="สมัครสมาชิก" onBack={onBack} onLanguageClick={onLanguageClick} />

      <div className="px-3 pt-4">
        <form className={`${AUTH_CARD_CLASS} space-y-2.5`} onSubmit={handleSubmit}>
          <AuthField
            icon={<PhoneIcon />}
            type="tel"
            placeholder="กรุณากรอกเบอร์โทรศัพท์"
            value={phone}
            onChange={setPhone}
          />
          <AuthField
            icon={<UserIcon />}
            placeholder="กรุณากรอกชื่อผู้ใช้"
            value={username}
            onChange={setUsername}
          />
          <AuthField
            icon={<LockIcon />}
            placeholder="กรุณากรอกรหัสผ่าน"
            value={password}
            onChange={setPassword}
            showToggle
          />
          <AuthField
            icon={<LockIcon />}
            placeholder="กรุณายืนยันรหัสผ่าน"
            value={confirm}
            onChange={setConfirm}
            showToggle
          />

          <p className="mt-1.5 px-0.5 text-[12px] text-[#7c8db5]">*ใช้ 6-20 ตัวอักษร</p>

          {error && <p className="mt-2 text-center text-xs text-[#ee0a24]">{error}</p>}

          <AuthPrimaryButton type="submit" loading={loading}>
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </AuthPrimaryButton>

          <p className="mt-3 text-center text-[13px] text-[#888]">
            <button type="button" onClick={onLoginClick} className="text-[#3b82f6]">
              เข้าสู่ระบบ
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
