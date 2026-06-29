import { PageNavBar } from '@/components/common/PageNavBar'
import { adminNavigate, goMemberApp } from '@/admin/adminRouting'
import { useAuth } from '@/context/AuthContext'

interface AdminMenuPageProps {
  onLogout: () => void
}

const MENU_ITEMS = [
  {
    key: 'recharge',
    title: 'รายการฝากเงิน',
    desc: 'RechargeAdmin — ดู/อนุมัติฝากทั้งหมด',
    color: '#148164',
    page: 'recharge' as const,
  },
  {
    key: 'withdraw',
    title: 'รายการถอนเงิน',
    desc: 'DepositAdmin — ดู/อนุมัติถอนทั้งหมด',
    color: '#427ffa',
    page: 'withdraw' as const,
  },
  {
    key: 'bets',
    title: 'ประวัติเดิมพัน',
    desc: 'BettingHistory — ดูเดิมพันทั้งระบบ',
    color: '#ff983b',
    page: 'bets' as const,
  },
  {
    key: 'members',
    title: 'จัดการสมาชิก',
    desc: 'HuiYuan — สมาชิกใต้สาย',
    color: '#7b6cff',
    page: 'members' as const,
  },
  {
    key: 'chongzhi',
    title: 'เติมเงินให้สมาชิก',
    desc: 'ChongZhi — เติมเงินด้วยมือ',
    color: '#1abc9c',
    page: 'chongzhi' as const,
  },
]

export function AdminMenuPage({ onLogout }: AdminMenuPageProps) {
  const { user } = useAuth()
  const roleLabel =
    user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'agent' ? 'ตัวแทน' : 'Staff'

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5] pb-8">
      <PageNavBar
        title="ศูนย์ผู้ดูแล"
        rightLabel="ออก"
        onRightClick={onLogout}
      />

      <div className="mx-2.5 mt-3 rounded-lg bg-[#427ffa] p-4 text-white">
        <p className="text-sm opacity-90">{roleLabel}</p>
        <p className="text-lg font-semibold">{user?.nickname ?? user?.username}</p>
      </div>

      <div className="space-y-2 p-2.5">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => adminNavigate({ page: item.page })}
            className="flex w-full flex-col rounded-lg bg-white p-4 text-left shadow-sm"
          >
            <span
              className="mb-1 inline-block w-fit rounded px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: item.color }}
            >
              {item.title}
            </span>
            <span className="text-xs text-[#888]">{item.desc}</span>
          </button>
        ))}

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
