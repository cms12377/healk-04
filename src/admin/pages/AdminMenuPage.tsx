import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Coins,
  Gamepad2,
  LogOut,
  MessageCircle,
  Smartphone,
  Users,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { adminNavigate, goMemberApp } from '@/admin/adminRouting'
import { adminFetchPendingStats } from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface AdminMenuPageProps {
  onLogout: () => void
}

const MENU_ITEMS: {
  key: string
  title: string
  desc: string
  icon: ReactNode
  iconBg: string
  page: 'recharge' | 'withdraw' | 'bets' | 'members' | 'chongzhi' | 'settings' | 'games'
  pendingKey: 'deposits' | 'withdraws' | null
}[] = [
  {
    key: 'recharge',
    title: 'รายการฝากเงิน',
    desc: 'อนุมัติรายการฝากที่รอดำเนินการ',
    icon: <ArrowDownToLine className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#e8f5e9] text-[#2e7d32]',
    page: 'recharge',
    pendingKey: 'deposits',
  },
  {
    key: 'withdraw',
    title: 'รายการถอนเงิน',
    desc: 'อนุมัติรายการถอนที่รอดำเนินการ',
    icon: <ArrowUpFromLine className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#eef2ff] text-[#4e72f3]',
    page: 'withdraw',
    pendingKey: 'withdraws',
  },
  {
    key: 'bets',
    title: 'ประวัติเดิมพัน',
    desc: 'ดูเดิมพันทั้งระบบ',
    icon: <Coins className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#fff3e6] text-[#e65100]',
    page: 'bets',
    pendingKey: null,
  },
  {
    key: 'members',
    title: 'สมาชิก',
    desc: 'จัดการสมาชิกใต้สาย',
    icon: <Users className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#f3e8ff] text-[#7b6cff]',
    page: 'members',
    pendingKey: null,
  },
  {
    key: 'chongzhi',
    title: 'เติมเงิน',
    desc: 'เติมเงินให้สมาชิกด้วยมือ',
    icon: <Smartphone className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#e0f7fa] text-[#00838f]',
    page: 'chongzhi',
    pendingKey: null,
  },
  {
    key: 'games',
    title: 'จัดการเกม',
    desc: 'โหมดสุ่ม/กำหนดผล งวดปัจจุบัน บังคับออกผล',
    icon: <Gamepad2 className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#fce4ec] text-[#c2185b]',
    page: 'games',
    pendingKey: null,
  },
  {
    key: 'settings',
    title: 'แชท & ตั้งค่า',
    desc: 'URL แชทฝ่ายบริการ ประกาศ สัญลักษณ์เงิน',
    icon: <MessageCircle className="h-4 w-4" strokeWidth={2.2} />,
    iconBg: 'bg-[#e3f2fd] text-[#1565c0]',
    page: 'settings',
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
    <div className="min-h-dvh bg-[#f5f5f9] pb-8">
      <PageNavBar
        title="ศูนย์ผู้ดูแล"
        variant="gradient"
        rightLabel="ออก"
        onRightClick={onLogout}
      />

      <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] p-5 text-white shadow-lg shadow-[#3880e5]/20">
        <p className="text-sm text-white/80">{roleLabel}</p>
        <p className="mt-0.5 text-lg font-bold">{user?.nickname ?? user?.username}</p>
        {(pending.deposits > 0 || pending.withdraws > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pending.deposits > 0 && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/20">
                ฝากรอ {pending.deposits}
              </span>
            )}
            {pending.withdraws > 0 && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/20">
                ถอนรอ {pending.withdraws}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
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
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:bg-[#f8faff] active:scale-[0.99]"
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  item.iconBg,
                )}
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#2c3345]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[#969799]">{item.desc}</p>
              </div>
              {badge > 0 ? (
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#e53935] px-1.5 text-xs font-bold text-white">
                  {badge}
                </span>
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-[#c8c9cc]" strokeWidth={2} />
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={goMemberApp}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#4e72f3]/30 bg-white py-3 text-sm font-semibold text-[#4e72f3] transition hover:bg-[#f8faff]"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          กลับไปแอปสมาชิก
        </button>
      </div>
    </div>
  )
}
