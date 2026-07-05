import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageNavBarProps {
  title: string
  variant?: 'blue' | 'white' | 'gradient'
  showBack?: boolean
  backLabel?: string
  onBack?: () => void
  onTitleClick?: () => void
  rightLabel?: string
  onRightClick?: () => void
  rightIcon?: ReactNode
  rightActions?: ReactNode
}

export function PageNavBar({
  title,
  variant = 'blue',
  showBack = false,
  backLabel = 'กลับ',
  onBack,
  onTitleClick,
  rightLabel,
  onRightClick,
  rightIcon,
  rightActions,
}: PageNavBarProps) {
  const isWhite = variant === 'white'
  const isGradient = variant === 'gradient'

  return (
    <header
      className={cn(
        'sticky top-0 z-[999] flex h-[46px] w-full items-center justify-center px-3',
        isWhite ? 'bg-white text-[#333]' : 'text-white',
      )}
      style={
        isWhite
          ? undefined
          : isGradient
            ? { background: 'linear-gradient(45deg, #3880e5, #86a7ff)' }
            : { backgroundColor: '#427ffa' }
      }
    >
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 flex items-center gap-0.5 text-base"
        >
          <ChevronLeft className="h-[23px] w-[23px]" strokeWidth={2} />
          <span>{backLabel}</span>
        </button>
      ) : null}
      {onTitleClick ? (
        <button type="button" onClick={onTitleClick} className="flex items-center gap-1 text-base font-medium">
          {title}
        </button>
      ) : (
        <span className="text-base font-medium">{title}</span>
      )}
      {rightActions ? (
        <div className="absolute right-3 flex items-center gap-1">{rightActions}</div>
      ) : rightIcon && onRightClick ? (
        <button type="button" onClick={onRightClick} className="absolute right-3">
          {rightIcon}
        </button>
      ) : rightLabel && onRightClick ? (
        <button
          type="button"
          onClick={onRightClick}
          className={cn(
            'absolute right-3 text-sm',
            isWhite ? 'text-[#5b7ffb]' : 'text-white',
          )}
        >
          {rightLabel}
        </button>
      ) : null}
    </header>
  )
}

interface FilterBarProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  variant?: 'default' | 'modern'
}

export function FilterBar({ options, value, onChange, variant = 'default' }: FilterBarProps) {
  const modern = variant === 'modern'
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto bg-white px-3 py-2',
        modern ? 'border-b border-gray-100' : 'border-b border-[#eee]',
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
            modern
              ? value === opt.value
                ? 'bg-[#4e72f3] text-white shadow-sm'
                : 'bg-white text-[#646566] ring-1 ring-[#ebedf0] hover:bg-[#f0f4ff]'
              : value === opt.value
                ? 'border border-[#427ffa] bg-[#427ffa] text-white'
                : 'border border-[#e5e5e5] bg-white text-[#333]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface TabBarProps {
  tabs: { value: string; label: string }[]
  active: string
  onChange: (value: string) => void
  variant?: 'underline' | 'pill'
}

export function TabBar({ tabs, active, onChange, variant = 'underline' }: TabBarProps) {
  return (
    <div
      className={cn(
        'flex bg-white',
        variant === 'underline' ? 'border-b border-[#eee]' : 'gap-2 p-2',
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors',
            variant === 'underline'
              ? active === tab.value
                ? 'border-b-2 border-[#427ffa] text-[#427ffa]'
                : 'text-[#666]'
              : active === tab.value
                ? 'rounded-full bg-[#4e72f3] text-white shadow-sm'
                : 'rounded-full border border-[#ebedf0] bg-white text-[#535867] hover:bg-[#f8faff]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function PrimaryButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function GreenButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 flex h-10 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
    >
      {children}
    </button>
  )
}

export function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm font-bold text-[#333]">{label}</div>
      {children}
    </div>
  )
}

export function InputBox({
  value,
  onChange,
  type = 'text',
  placeholder,
  prefix,
  maxLength,
  disabled,
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  prefix?: string
  maxLength?: number
  disabled?: boolean
}) {
  return (
    <div className={cn('flex items-center rounded-md bg-[#f5f5f9] px-3', disabled && 'opacity-60')}>
      {prefix && <span className="mr-2 text-sm text-[#666]">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="h-10 w-full bg-transparent text-sm outline-none disabled:cursor-not-allowed"
      />
    </div>
  )
}
