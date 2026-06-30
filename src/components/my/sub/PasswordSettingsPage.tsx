import { SubCard, SubMenuRow, SubPageShell } from '@/components/my/sub/SubPageShell'
import type { SubPage } from '@/types'

interface PasswordSettingsPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

export function PasswordSettingsPage({ onBack, onNavigate }: PasswordSettingsPageProps) {
  return (
    <SubPageShell title="ตั้งค่ารหัสผ่าน" variant="white" onBack={onBack}>
      <SubCard className="mt-3">
        <SubMenuRow
          label="เปลี่ยนรหัสผ่านเข้าสู่ระบบ"
          onClick={() => onNavigate('edit-password')}
        />
        <SubMenuRow
          label="เปลี่ยนรหัสผ่านถอน"
          onClick={() => onNavigate('edit-pay-password')}
        />
      </SubCard>
    </SubPageShell>
  )
}
