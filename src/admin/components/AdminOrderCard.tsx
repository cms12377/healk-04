import { formatTimestamp } from '@/services/wallet'
import type { AdminDepositOrder, AdminWithdrawOrder } from '@/types'

interface AdminOrderCardProps {
  amount: number
  statusText: string
  createtime: number
  username?: string
  fee?: number
  adminNote?: string
  pending?: boolean
  actionId?: number | null
  orderId?: number
  onApprove?: () => void
  onReject?: () => void
}

export function AdminOrderCard({
  amount,
  statusText,
  createtime,
  username,
  fee,
  adminNote,
  pending,
  actionId,
  orderId,
  onApprove,
  onReject,
}: AdminOrderCardProps) {
  return (
    <div className="border-b border-[#eee] bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-semibold text-[#333]">{amount.toLocaleString()}</div>
          {username && <div className="truncate text-xs text-[#888]">@{username}</div>}
          {fee !== undefined && fee > 0 && (
            <div className="text-xs text-[#888]">ค่าธรรมเนียม {fee.toLocaleString()}</div>
          )}
          <div className="mt-1.5 inline-flex min-w-[70px] items-center justify-center rounded-[7.5px] bg-[#1E88FF] px-1.5 py-0.5 text-[14px] text-white">
            {statusText}
          </div>
        </div>
        <div className="shrink-0 text-right text-[16px] font-semibold text-[#00BE7D]">
          {formatTimestamp(createtime)}
        </div>
      </div>
      {adminNote && (
        <p className="mt-1.5 text-xs text-[#666]">หมายเหตุ: {adminNote}</p>
      )}
      {pending && onApprove && onReject && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={actionId === orderId}
            onClick={onApprove}
            className="flex-1 rounded bg-[#148164] py-1.5 text-xs text-white disabled:opacity-60"
          >
            อนุมัติ
          </button>
          <button
            type="button"
            disabled={actionId === orderId}
            onClick={onReject}
            className="flex-1 rounded bg-[#ee5b5a] py-1.5 text-xs text-white disabled:opacity-60"
          >
            ปฏิเสธ
          </button>
        </div>
      )}
    </div>
  )
}

export function AdminDepositCard({
  row,
  showUsername,
  actionId,
  onReview,
}: {
  row: AdminDepositOrder
  showUsername: boolean
  actionId: number | null
  onReview: (id: number, action: 'approve' | 'reject') => void
}) {
  return (
    <AdminOrderCard
      amount={row.amount}
      statusText={row.statusText}
      createtime={row.createtime}
      username={showUsername ? row.username : undefined}
      adminNote={row.adminNote}
      pending={row.status === 'pending'}
      actionId={actionId}
      orderId={row.id}
      onApprove={() => onReview(row.id, 'approve')}
      onReject={() => onReview(row.id, 'reject')}
    />
  )
}

export function AdminWithdrawCard({
  row,
  showUsername,
  actionId,
  onReview,
}: {
  row: AdminWithdrawOrder
  showUsername: boolean
  actionId: number | null
  onReview: (id: number, action: 'approve' | 'reject') => void
}) {
  return (
    <AdminOrderCard
      amount={row.amount}
      statusText={row.statusText}
      createtime={row.createtime}
      username={showUsername ? row.username : undefined}
      fee={row.fee}
      adminNote={row.adminNote}
      pending={row.status === 'pending'}
      actionId={actionId}
      orderId={row.id}
      onApprove={() => onReview(row.id, 'approve')}
      onReject={() => onReview(row.id, 'reject')}
    />
  )
}
