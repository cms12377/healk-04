import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ASSETS } from '@/constants/assets'

export function AuthNavBar({
  title,
  onBack,
  onLanguageClick,
}: {
  title: string
  onBack: () => void
  onLanguageClick?: () => void
}) {
  return (
    <header className="sticky top-0 z-[999] flex h-[46px] w-full items-center justify-center bg-[#427ffa] text-white">
      <button type="button" onClick={onBack} className="absolute left-3 flex items-center">
        <ChevronLeft className="h-[23px] w-[23px]" strokeWidth={2} />
      </button>
      <span className="text-base font-medium">{title}</span>
      {onLanguageClick ? (
        <button
          type="button"
          onClick={onLanguageClick}
          className="absolute right-3 flex items-center gap-0.5 text-[13px]"
        >
          <img src={ASSETS.langIcon} alt="" className="h-[30px] w-[30px]" />
          <span>ภาษา</span>
        </button>
      ) : null}
    </header>
  )
}

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[#9bb6ff]">
      {children}
    </span>
  )
}

export function UserIcon() {
  return (
    <FieldIcon>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 7a7 7 0 0 1 14 0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </FieldIcon>
  )
}

export function PhoneIcon() {
  return (
    <FieldIcon>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1"
        />
      </svg>
    </FieldIcon>
  )
}

export function LockIcon() {
  return (
    <FieldIcon>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" />
        <path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" />
      </svg>
    </FieldIcon>
  )
}

export function AuthField({
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  showToggle,
}: {
  icon: ReactNode
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  showToggle?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const inputType = showToggle ? (visible ? 'text' : 'password') : type

  return (
    <label className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-2.5 py-2">
      {icon}
      <input
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 border-none bg-transparent text-[14px] text-[#333] outline-none placeholder:text-[#b9b9b9]"
      />
      {showToggle ? (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex h-6 w-6 items-center justify-center text-[#9aa1ab] hover:text-[#6b7a99]"
          aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      ) : (
        <span />
      )}
    </label>
  )
}

export function AuthPrimaryButton({
  children,
  loading,
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="mt-3.5 h-[42px] w-full rounded-full border-none bg-[#5f97ff] text-base font-semibold text-white shadow-[inset_0_2px_#4e86ff] disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function AuthSplit() {
  return (
    <div className="my-3.5 flex items-center gap-2 text-[13px] text-[#999]">
      <i className="h-px flex-1 bg-[#eee]" />
      <span className="whitespace-nowrap">หรือ</span>
      <i className="h-px flex-1 bg-[#eee]" />
    </div>
  )
}

export function AuthQuickActions({
  onRegister,
  onDesktop,
}: {
  onRegister: () => void
  onDesktop: () => void
}) {
  return (
    <div className="mt-1.5 flex items-center justify-around">
      <button type="button" onClick={onRegister} className="text-center text-[#555]">
        <span
          className="mx-auto mb-1.5 flex h-[54px] w-[54px] items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
          style={{ backgroundColor: '#ff9f3f' }}
        >
          <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" aria-hidden>
            <path
              d="M12 12V4M8 8h8M5 12v8h14v-8"
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[13px]">สมัครสมาชิก</span>
      </button>
      <button type="button" onClick={onDesktop} className="text-center text-[#555]">
        <span
          className="mx-auto mb-1.5 flex h-[54px] w-[54px] items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
          style={{ backgroundColor: '#28c76f' }}
        >
          <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" aria-hidden>
            <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="#fff" />
            <path d="M9 20h6M10 16h4" stroke="#fff" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-[13px]">เว็บเดสก์ท็อป</span>
      </button>
    </div>
  )
}

export const AUTH_CARD_CLASS =
  'mx-auto w-[92%] max-w-[340px] rounded-lg bg-white px-4 pb-5 pt-4 font-[system-ui,-apple-system,BlinkMacSystemFont,"Segoe_UI",Roboto,sans-serif]'

export const DESKTOP_SITE_URL = 'https://th5566.vip'
