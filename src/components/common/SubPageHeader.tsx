import { ChevronLeft } from 'lucide-react'

interface SubPageHeaderProps {
  title: string
  onBack: () => void
}

export function SubPageHeader({ title, onBack }: SubPageHeaderProps) {
  return (
    <header className="sticky top-0 z-999 flex h-[44px] items-center bg-linear-to-br from-[#3880e5] to-[#86a7ff] px-2 text-white">
      <button type="button" onClick={onBack} className="flex items-center gap-1 px-2 py-1">
        <ChevronLeft className="h-5 w-5" />
        <span className="text-sm">กลับ</span>
      </button>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">{title}</h1>
    </header>
  )
}
