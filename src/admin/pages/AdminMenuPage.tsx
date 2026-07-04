import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  ChevronRight,
  Coins,
  Gamepad2,
  Gift,
  IdCard,
  LogOut,
  MessageCircle,
  Settings,
  Smartphone,
  Users,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminNavBar } from '@/admin/components/AdminNavBar'
import { adminNavigate, goMemberApp, AGENT_MENU } from '@/admin/adminRouting'
import { adminFetchPendingStats, adminServiceUnreadCount } from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { AdminPage } from '@/types'

interface AdminMenuPageProps {
  onLogout: () => void
}

type PendingKey = 'deposits' | 'withdraws' | 'identity' | 'serviceChat' | null

const AGENT_ICONS: Record<string, { icon: ReactNode; iconBg: string }> = {
  recharge: {
    icon: <ArrowDownToLine className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#e8f5e9] text-[#2e7d32]',
  },
  withdraw: {
    icon: <ArrowUpFromLine className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#eef2ff] text-[#4e72f3]',
  },
  bets: {
    icon: <Coins className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#fff3e6] text-[#e65100]',
  },
  members: {
    icon: <Users className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#f3e8ff] text-[#7b6cff]',
  },
  chongzhi: {
    icon: <Smartphone className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#e0f7fa] text-[#00838f]',
  },
  identity: {
    icon: <IdCard className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#fff8e1] text-[#f57f17]',
  },
}

const ADMIN_ONLY_ITEMS: {
  key: string
  title: string
  desc: string
  icon: ReactNode
  iconBg: string
  page: AdminPage
  pendingKey: PendingKey
}[] = [
  {
    key: 'deposit-accounts',
    title: 'จัดการบัญชีฝาก',
    desc: 'บัญชีธนาคาร & คริปโตที่สมาชิกใช้ฝาก',
    icon: <Building2 className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#e8eaf6] text-[#3949ab]',
    page: 'deposit-accounts',
    pendingKey: null,
  },
  {
    key: 'games',
    title: 'จัดการเกม',
    desc: 'เปิด/ปิดเกม โหมดออกผล และกำหนดผลรอบถัดไป',
    icon: <Gamepad2 className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#fce4ec] text-[#c2185b]',
    page: 'games',
    pendingKey: null,
  },
  {
    key: 'draw-schedule',
    title: 'ตารางผลล่วงหน้า',
    desc: 'กำหนดผลทุกรอบตามช่วงเวลา สุ่มหรือแก้ไขทีละงวด',
    icon: <Gamepad2 className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#e8eaf6] text-[#3949ab]',
    page: 'draw-schedule',
    pendingKey: null,
  },
  {
    key: 'bonus',
    title: 'จัดการโบนัส',
    desc: 'โปรโมชั่น VIP และข้อความสมาชิก',
    icon: <Gift className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#fff3e0] text-[#ff9800]',
    page: 'bonus',
    pendingKey: null,
  },
  {
    key: 'service-chat',
    title: 'แชทบริการ',
    desc: 'ตอบกลับข้อความจากสมาชิกและผู้เยี่ยมชม',
    icon: <MessageCircle className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#e3f2fd] text-[#1565c0]',
    page: 'service-chat',
    pendingKey: 'serviceChat',
  },
  {
    key: 'settings',
    title: 'ตั้งค่า',
    desc: 'ประกาศหน้าแรก สัญลักษณ์เงิน',
    icon: <Settings className={AD.icon} strokeWidth={2.2} />,
    iconBg: 'bg-[#eceff1] text-[#546e7a]',
    page: 'settings',
    pendingKey: null,
  },
]

function MenuButton({
  title,
  desc,
  icon,
  iconBg,
  badge,
  onClick,
}: {
  title: string
  desc: string
  icon: ReactNode
  iconBg: string
  badge: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(AD.menuItem, 'transition hover:bg-[#f8faff] active:scale-[0.99]')}
    >
      <span className={cn(AD.iconBox, iconBg)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={AD.titleMd}>{title}</p>
        <p className={cn('mt-1', AD.subtitle)}>{desc}</p>
      </div>
      {badge > 0 ? (
        <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#e53935] px-2 text-sm font-bold text-white">
          {badge}
        </span>
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-[#c8c9cc]" strokeWidth={2} />
      )}
    </button>
  )
}

export function AdminMenuPage({ onLogout }: AdminMenuPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [pending, setPending] = useState({
    deposits: 0,
    withdraws: 0,
    identity: 0,
    serviceChat: 0,
  })

  useEffect(() => {
    Promise.all([adminFetchPendingStats(), adminServiceUnreadCount()])
      .then(([s, unread]) =>
        setPending({
          deposits: s.pendingDeposits,
          withdraws: s.pendingWithdraws,
          identity: s.pendingIdentity,
          serviceChat: unread,
        }),
      )
      .catch(() => {})
  }, [])

  const roleLabel =
    user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'agent' ? 'ตัวแทน' : 'Staff'

  const pendingBadge = (key: PendingKey) => {
    if (key === 'deposits') return pending.deposits
    if (key === 'withdraws') return pending.withdraws
    if (key === 'identity') return pending.identity
    if (key === 'serviceChat') return pending.serviceChat
    return 0
  }

  return (
    <div className={cn(AD.shell, AD.shellPad)}>
      <AdminNavBar title="ศูนย์ผู้ดูแล" variant="gradient" rightLabel="ออก" onRightClick={onLogout} />

      <div className="mx-3 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] p-6 text-white shadow-lg shadow-[#3880e5]/20">
        <p className="text-base text-white/85">{roleLabel}</p>
        <p className="mt-1 text-2xl font-bold">{user?.nickname ?? user?.username}</p>
        <p className="mt-2 text-sm text-white/75">
          แผงตัวแทน — ฝาก · ถอน · เดิมพัน · สมาชิก · เติมมือ · KYC
        </p>
        {(pending.deposits > 0 || pending.withdraws > 0 || pending.identity > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pending.deposits > 0 && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
                ฝากรอ {pending.deposits}
              </span>
            )}
            {pending.withdraws > 0 && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
                ถอนรอ {pending.withdraws}
              </span>
            )}
            {pending.identity > 0 && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
                KYC รอ {pending.identity}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 p-3">
        <p className="px-1 text-sm font-semibold text-[#646566]">แผงตัวแทน</p>
        {AGENT_MENU.map((item) => {
          const visual = AGENT_ICONS[item.page] ?? AGENT_ICONS.members
          return (
            <MenuButton
              key={item.page}
              title={item.title}
              desc={item.desc}
              icon={visual.icon}
              iconBg={visual.iconBg}
              badge={pendingBadge(item.pendingKey)}
              onClick={() => adminNavigate({ page: item.page })}
            />
          )
        })}

        {isAdmin && (
          <>
            <p className="px-1 pt-2 text-sm font-semibold text-[#646566]">
              ผู้ดูแลระบบ (เพิ่มเติม)
            </p>
            {ADMIN_ONLY_ITEMS.map((item) => (
              <MenuButton
                key={item.key}
                title={item.title}
                desc={item.desc}
                icon={item.icon}
                iconBg={item.iconBg}
                badge={pendingBadge(item.pendingKey)}
                onClick={() => adminNavigate({ page: item.page })}
              />
            ))}
          </>
        )}

        {!isAdmin && (
          <p className={cn('rounded-xl px-3 py-2.5 text-sm', AD.hint)}>
            ตัวแทนดูและอนุมัติรายการได้ตามสายงาน — ตั้งค่าระบบเพิ่มเติมเฉพาะผู้ดูแลระบบ
          </p>
        )}

        <button
          type="button"
          onClick={goMemberApp}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#4e72f3]/30 bg-white py-4 text-base font-semibold text-[#4e72f3] transition hover:bg-[#f8faff]"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          กลับไปแอปสมาชิก
        </button>
      </div>
    </div>
  )
}
