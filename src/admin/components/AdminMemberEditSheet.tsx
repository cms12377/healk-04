import { useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { cn } from '@/lib/utils'
import type { AdminMember } from '@/types'

interface AdminMemberEditSheetProps {
  member: AdminMember | null
  isAdmin: boolean
  saving: boolean
  onClose: () => void
  onSave: (input: {
    nickname: string
    phone: string
    realName: string
    money?: number
  }) => void
  onResetPayPassword: (member: AdminMember, password: string) => void
  onToggleBlock: (member: AdminMember) => void
  onDelete: (member: AdminMember) => void
  onViewMemberRecords?: (
    member: AdminMember,
    view: 'deposits' | 'withdraws' | 'bets' | 'payment',
  ) => void
}

function payPwdDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function AdminMemberEditSheet({
  member,
  isAdmin,
  saving,
  onClose,
  onSave,
  onResetPayPassword,
  onToggleBlock,
  onDelete,
  onViewMemberRecords,
}: AdminMemberEditSheetProps) {
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [realName, setRealName] = useState('')
  const [money, setMoney] = useState('')
  const [payPwd, setPayPwd] = useState('')

  useEffect(() => {
    if (!member) return
    setNickname(member.nickname)
    setPhone(member.phone ?? '')
    setRealName(member.realName ?? '')
    setMoney(String(member.money))
    setPayPwd('')
  }, [member])

  if (!member) return null

  const blocked = member.status === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div
        className={cn(
          'max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl ring-2',
          blocked ? 'ring-[#ffcdd2]' : 'ring-transparent',
        )}
        role="dialog"
        aria-labelledby="member-edit-title"
      >
        {blocked && (
          <div className="mb-4 rounded-xl bg-[#ffebee] px-3 py-2.5 text-center text-sm font-semibold text-[#c62828] ring-1 ring-[#ffcdd2]">
            บัญชีนี้ถูกบล็อก — เข้าระบบได้ แต่ไม่สามารถเดิมพัน/ฝาก/ถอนได้
          </div>
        )}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="member-edit-title" className={AD.titleMd}>
              แก้ไขสมาชิก
            </h2>
            <p className={cn('mt-1', AD.hint)}>@{member.username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[#888] hover:bg-[#f5f5f9]"
          >
            ปิด
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className={AD.label}>ชื่อเล่น</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={cn(AD.input, 'mt-1')}
            />
          </label>
          <label className="block">
            <span className={AD.label}>เบอร์โทร</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cn(AD.input, 'mt-1')}
            />
          </label>
          <label className="block">
            <span className={AD.label}>ชื่อจริง</span>
            <input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              className={cn(AD.input, 'mt-1')}
            />
          </label>
          {isAdmin && (
            <label className="block">
              <span className={AD.label}>ยอดเงิน (฿)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={money}
                onChange={(e) => setMoney(e.target.value)}
                className={cn(AD.input, 'mt-1 tabular-nums')}
              />
            </label>
          )}

          <div className="rounded-xl border border-[#ebedf0] bg-[#fafbfc] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className={AD.label}>รหัสผ่านถอน</span>
              <span className="font-mono text-xs tracking-[0.2em] text-[#646566]">
                {member.hasPayPassword ? '******' : 'ยังไม่ตั้ง'}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#969799]">
              สมาชิกตั้งเองได้ครั้งเดียว — ผู้ดูแล/ตัวแทนรีเซ็ตได้ที่นี่
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={payPwd}
              onChange={(e) => setPayPwd(payPwdDigits(e.target.value))}
              placeholder="รหัสถอนใหม่ 6 หลัก"
              className={cn(AD.input, 'mt-2 tabular-nums tracking-widest')}
            />
            <button
              type="button"
              disabled={saving || payPwd.length !== 6}
              onClick={() => {
                if (!window.confirm(`รีเซ็ตรหัสผ่านถอนของ @${member.username}?`)) return
                onResetPayPassword(member, payPwd)
              }}
              className="mt-2 w-full rounded-xl border-2 border-[#4e72f3] py-2.5 text-sm font-semibold text-[#4e72f3] disabled:opacity-50"
            >
              {member.hasPayPassword ? 'รีเซ็ตรหัสผ่านถอน' : 'ตั้งรหัสผ่านถอนให้สมาชิก'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                blocked ? 'bg-[#ffebee] text-[#c62828] ring-1 ring-[#ffcdd2]' : 'bg-[#e8f5e9] text-[#2e7d32]',
              )}
            >
              {blocked ? '● ถูกบล็อก' : '● ใช้งานปกติ'}
            </span>
            {member.identityStatus && (
              <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#4e72f3]">
                KYC: {member.identityStatus}
              </span>
            )}
          </div>
        </div>

        {onViewMemberRecords && (
          <div className="mt-4 rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#eef2ff]">
            <p className="mb-2 text-xs font-semibold text-[#646566]">ดูรายการของสมาชิก</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['deposits', 'ฝากเงิน'],
                  ['withdraws', 'ถอนเงิน'],
                  ['bets', 'เดิมพัน'],
                  ['payment', 'บัญชีถอน'],
                ] as const
              ).map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  disabled={saving}
                  onClick={() => onViewMemberRecords(member, view)}
                  className="rounded-lg border border-[#ebedf0] bg-white py-2 text-xs font-semibold text-[#4e72f3] hover:bg-[#eef2ff] disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onSave({
                nickname: nickname.trim(),
                phone: phone.trim(),
                realName: realName.trim(),
                money: isAdmin ? Number(money) : undefined,
              })
            }
            className={cn(
              AD.btn,
              'bg-gradient-to-r from-[#3880e5] to-[#4e72f3] text-white disabled:opacity-50',
            )}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onToggleBlock(member)}
            className={cn(
              'w-full rounded-xl border-2 py-3 text-sm font-semibold disabled:opacity-50',
              blocked
                ? 'border-[#2e7d32] bg-[#e8f5e9] text-[#2e7d32]'
                : 'border-[#e65100] bg-[#fff8e6] text-[#e65100]',
            )}
          >
            {blocked ? 'ปลดบล็อก' : 'บล็อกบัญชี'}
          </button>
          {isAdmin && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onDelete(member)}
              className="w-full rounded-xl border-2 border-[#c62828] bg-[#ffebee] py-3 text-sm font-semibold text-[#c62828] disabled:opacity-50"
            >
              ลบสมาชิก
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
