import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { getLanguage, LANG_OPTIONS, setLanguage } from '@/services/wallet'
import { cn } from '@/lib/utils'

interface LangPageProps {
  onBack: () => void
}

export function LangPage({ onBack }: LangPageProps) {
  const [current, setCurrent] = useState('th')

  useEffect(() => {
    setCurrent(getLanguage())
  }, [])

  const select = (lang: string) => {
    setLanguage(lang)
    setCurrent(lang)
  }

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ภาษา" variant="white" showBack onBack={onBack} />
      <div className="mt-2 bg-white">
        {LANG_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            className={cn(
              'flex w-full items-center justify-between border-b border-[#eee] px-5 py-4 text-left',
              current === opt.value && 'bg-[#f8fcff]',
            )}
          >
            <span className="flex items-center gap-3 text-base">
              <span>{opt.flag}</span>
              {opt.label}
            </span>
            {current === opt.value && <span className="text-[#427ffa]">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
