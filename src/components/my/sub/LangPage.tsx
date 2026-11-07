import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
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
    <SubPageShell title="ภาษา" variant="white" onBack={onBack}>
      <SubCard className="mt-3">
        {LANG_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            className={cn(
              'flex w-full items-center justify-between border-b border-gray-100 px-4 py-4 text-left transition last:border-0 hover:bg-[#f8faff]',
              current === opt.value && 'bg-[#f8faff]',
            )}
          >
            <span className="flex items-center gap-3 text-sm font-medium text-[#2c3345]">
              <span className="text-lg">{opt.flag}</span>
              {opt.label}
            </span>
            {current === opt.value && (
              <Check className="h-4 w-4 text-[#4e72f3]" strokeWidth={2.5} />
            )}
          </button>
        ))}
      </SubCard>
    </SubPageShell>
  )
}
