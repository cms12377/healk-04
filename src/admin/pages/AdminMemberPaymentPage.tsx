import { CreditCard, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { adminGetMemberPayment } from '@/services/admin'
import { formatTimestamp } from '@/services/wallet'
import { cn } from '@/lib/utils'
import type { AdminMemberPaymentInfo } from '@/types'

interface AdminMemberPaymentPageProps {
  userId: number
  username?: string
  onBack: () => void
}

const IDENTITY_LABEL: Record<string, string> = {
  pending: 'รอตรวจ',
  approved: 'ยืนยันแล้ว',
  rejected: 'ถูกปฏิเสธ',
  none: 'ยังไม่ยื่น',
}

export function AdminMemberPaymentPage({
  userId,
  username,
  onBack,
}: AdminMemberPaymentPageProps) {
  const [info, setInfo] = useState<AdminMemberPaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    adminGetMemberPayment(userId)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [userId])

  const title = username ?? info?.user.username ?? `สมาชิก #${userId}`

  return (
    <AdminPageLayout
      title={`ช่องทางชำระ — ${title}`}
      variant="gradient"
      showBack
      onBack={onBack}
    >
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#4e72f3] border-t-transparent" />
        </div>
      )}

      {error && (
        <p className="mx-3 mt-3 rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
          {error}
        </p>
      )}

      {info && !loading && (
        <div className={cn(AD.pagePad, AD.stack)}>
          <section className={AD.card}>
            <h2 className={AD.titleMd}>ข้อมูลสมาชิก</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-4">
                <dt className={AD.label}>ชื่อผู้ใช้</dt>
                <dd className={AD.value}>{info.user.username}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={AD.label}>ชื่อจริง</dt>
                <dd className={AD.value}>{info.user.realName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={AD.label}>ยืนยันตัวตน</dt>
                <dd className={AD.value}>
                  {IDENTITY_LABEL[info.user.identityStatus] ?? info.user.identityStatus}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={AD.label}>ยอดเงิน</dt>
                <dd className={cn(AD.value, 'text-[#4e72f3]')}>
                  {info.user.money.toLocaleString()} ฿
                </dd>
              </div>
            </dl>
          </section>

          <section className={AD.card}>
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#4e72f3]" />
              <h2 className={AD.titleMd}>บัญชีธนาคาร</h2>
              <span className={cn(AD.badge, 'bg-[#f0f0f0] text-[#666]')}>
                {info.bankCards.length}
              </span>
            </div>
            {info.bankCards.length === 0 ? (
              <p className={AD.subtitle}>ยังไม่ผูกบัญชีธนาคาร</p>
            ) : (
              <ul className="space-y-3">
                {info.bankCards.map((card) => (
                  <li key={card.id} className={AD.cardInner}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={AD.value}>{card.bankName}</span>
                      {card.isDefault && (
                        <span className={cn(AD.badge, 'bg-[#e8f5e9] text-[#2e7d32]')}>
                          หลัก
                        </span>
                      )}
                    </div>
                    <p className={cn('mt-1', AD.body)}>{card.bankUsername}</p>
                    <p className={cn('mt-1 font-mono', AD.value)}>{card.bankCard}</p>
                    <p className={cn('mt-1', AD.hint)}>
                      ผูกเมื่อ {formatTimestamp(card.createtime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={AD.card}>
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#e65100]" />
              <h2 className={AD.titleMd}>กระเป๋า Crypto</h2>
              <span className={cn(AD.badge, 'bg-[#f0f0f0] text-[#666]')}>
                {info.cryptoWallets.length}
              </span>
            </div>
            {info.cryptoWallets.length === 0 ? (
              <p className={AD.subtitle}>ยังไม่ผูกที่อยู่ crypto</p>
            ) : (
              <ul className="space-y-3">
                {info.cryptoWallets.map((w) => (
                  <li key={w.id} className={AD.cardInner}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={AD.value}>{w.remark || 'กระเป๋า'}</span>
                      {w.isDefault && (
                        <span className={cn(AD.badge, 'bg-[#e8f5e9] text-[#2e7d32]')}>
                          หลัก
                        </span>
                      )}
                    </div>
                    <p className={cn('mt-1 break-all font-mono text-sm', AD.body)}>
                      {w.address}
                    </p>
                    <p className={cn('mt-1', AD.hint)}>
                      ผูกเมื่อ {formatTimestamp(w.createtime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminPageLayout>
  )
}
