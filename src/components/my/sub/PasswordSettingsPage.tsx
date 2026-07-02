import { SubCard, SubMenuRow, SubPageShell } from '@/components/my/sub/SubPageShell'
import { IDENTITY_STATUS_CLASS, IDENTITY_STATUS_LABEL } from '@/lib/statusBadge'
import { useAuth } from '@/context/AuthContext'
import type { SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface PasswordSettingsPageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', className)}>
      {label}
    </span>
  )
}

export function PasswordSettingsPage({ onBack, onNavigate }: PasswordSettingsPageProps) {
  const { user } = useAuth()
  const identityStatus = user?.identityStatus ?? 'none'

  return (
    <SubPageShell title="ตั้งค่ารหัสผ่าน" variant="white" onBack={onBack}>
      <SubCard className="mt-3">
        <SubMenuRow
          label="เปลี่ยนรหัสผ่านเข้าสู่ระบบ"
          onClick={() => onNavigate('edit-password')}
        />
        <SubMenuRow
          label="รหัสผ่านถอน"
          trailing={
            user?.hasPayPassword ? (
              <span className="font-mono text-xs tracking-[0.2em] text-[#646566]">******</span>
            ) : (
              <StatusPill label="ยังไม่ตั้ง" className="bg-[#eceff1] text-[#546e7a]" />
            )
          }
          onClick={() => onNavigate('edit-pay-password')}
        />
        <SubMenuRow
          label="ยืนยันตัวตน"
          trailing={
            identityStatus !== 'none' ? (
              <StatusPill
                label={IDENTITY_STATUS_LABEL[identityStatus] ?? identityStatus}
                className={IDENTITY_STATUS_CLASS[identityStatus] ?? IDENTITY_STATUS_CLASS.none}
              />
            ) : (
              <StatusPill label="ยังไม่ยื่น" className={IDENTITY_STATUS_CLASS.none} />
            )
          }
          onClick={() => onNavigate('identity-card')}
        />
        <SubMenuRow
          label="ประวัติฝากเงิน"
          onClick={() => onNavigate('deposit-history')}
        />
      </SubCard>
    </SubPageShell>
  )
}
