import { PageNavBar } from '@/components/common/PageNavBar'
import type { SubPage } from '@/types'

interface PasswordSettingsPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

export function PasswordSettingsPage({ onBack, onNavigate }: PasswordSettingsPageProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar title="ตั้งค่ารหัสผ่าน" variant="white" showBack onBack={onBack} />

      <div className="mt-2.5 bg-white">
        <button
          type="button"
          onClick={() => onNavigate('edit-password')}
          className="flex w-full items-center justify-between border-b border-[#eee] px-4 py-4 text-sm text-[#333]"
        >
          <span>เปลี่ยนรหัสผ่านเข้าสู่ระบบ</span>
          <span className="text-[#ccc]">›</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('edit-pay-password')}
          className="flex w-full items-center justify-between px-4 py-4 text-sm text-[#333]"
        >
          <span>เปลี่ยนรหัสผ่านถอน</span>
          <span className="text-[#ccc]">›</span>
        </button>
      </div>
    </div>
  )
}
