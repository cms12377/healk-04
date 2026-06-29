import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { adminNavigate, goMemberApp } from '@/admin/adminRouting'
import { adminFetchPendingStats } from '@/services/admin'
import { useAuth } from '@/context/AuthContext'

interface AdminMenuPageProps {
  onLogout: () => void
}

const MENU_ITEMS = [
  {
    key: 'recharge',
    title: 'รายการฝากเงิน',
    desc: 'RechargeAdmin — ฝากทั้งหมด / อนุมัติรายการรอดำเนินการ',
    color: '#148164',
    page: 'recharge' as const,
    pendingKey: 'deposits' as const,
  },
  {
    key: 'withdraw',
    title: 'รายการถอนเงิน',
    desc: 'DepositAdmin — ถอนทั้งหมด / อนุมัติรายการรอดำเนินการ',
    color: '#427ffa',
    page: 'withdraw' as const,
    pendingKey: 'withdraws' as const,
  },
  {
    key: 'bets',
    title: 'ประวัติเดิมพัน',
    desc: 'BettingHistory — ดูเดิมพันทั้งระบบ',
    color: '#ff983b',
    page: 'bets' as const,
    pendingKey: null,
  },
  {
    key: 'members',
    title: 'สมาชิก',
    desc: 'HuiYuan — จัดการสมาชิกใต้สาย',
    color: '#7b6cff',
    page: 'members' as const,
    pendingKey: null,
  },
  {
    key: 'chongzhi',
    title: 'เติมเงิน',
    desc: 'ChongZhi — เติมเงินให้สมาชิกด้วยมือ',
    color: '#1abc9c',
    page: 'chongzhi' as const,
    pendingKey: null,
  },
]

export function AdminMenuPage({ onLogout }: AdminMenuPageProps) {
  const { user } = useAuth()
  const [pending, setPending] = useState({ deposits: 0, withdraws: 0 })

  useEffect(() => {
    adminFetchPendingStats()
      .then((s) => setPending({ deposits: s.pendingDeposits, withdraws: s.pendingWithdraws }))
      .catch(() => {})
  }, [])

  const roleLabel =
    user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'agent' ? 'ตัวแทน' : 'Staff'

  return (
    <div className="min-h-dvh bg-[#f5f5f5] pb-8">
      <PageNavBar title="ศูนย์ผู้ดูแล" rightLabel="ออก" onRightClick={onLogout} />

      <div className="mx-2.5 mt-3 rounded-lg bg-[#427ffa] p-4 text-white">
        <p className="text-sm opacity-90">{roleLabel}</p>
        <p className="text-lg font-semibold">{user?.nickname ?? user?.username}</p>
        {(pending.deposits > 0 || pending.withdraws > 0) && (
          <p className="mt-2 text-xs opacity-90">
            รออนุมัติ: ฝาก {pending.deposits} · ถอน {pending.withdraws}
          </p>
        )}
      </div>

      <div className="space-y-2 p-2.5">
        {MENU_ITEMS.map((item) => {
          const badge =
            item.pendingKey === 'deposits'
              ? pending.deposits
              : item.pendingKey === 'withdraws'
                ? pending.withdraws
                : 0
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => adminNavigate({ page: item.page })}
              className="flex w-full items-start justify-between rounded-lg bg-white p-4 text-left shadow-sm"
            >
              <div>
                <span
                  className="mb-1 inline-block rounded px-2 py-0.5 text-xs text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.title}
                </span>
                <span className="block text-xs text-[#888]">{item.desc}</span>
              </div>
              {badge > 0 && (
                <span className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ee5b5a] px-1.5 text-xs text-white">
                  {badge}
                </span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={goMemberApp}
          className="mt-4 w-full rounded-lg border border-[#427ffa] bg-white py-3 text-sm text-[#427ffa]"
        >
          กลับไปแอปสมาชิก
        </button>
      </div>
    </div>
  )
}
