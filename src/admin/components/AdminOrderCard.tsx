import { formatTimestamp } from '@/services/wallet'
import type { AdminDepositOrder, AdminWithdrawOrder } from '@/types'
import type { ReactNode } from 'react'

const CHANNEL_LABEL: Record<string, string> = {
  bank: 'ธนาคาร',
  crypto: 'คริปโต',
}

function formatDepositProof(proof?: string): { label: string; value: string; href?: string } | null {
  if (!proof) return null
  if (proof.startsWith('transfer_at:')) {
    const raw = proof.slice('transfer_at:'.length)
    const display = raw.includes('T') ? raw.replace('T', ' ') : raw
    return { label: 'เวลาโอน', value: display }
  }
  if (proof.startsWith('http://') || proof.startsWith('https://') || proof.startsWith('data:')) {
    return { label: 'หลักฐาน', value: 'เปิดรูป/ลิงก์', href: proof }
  }
  return { label: 'Hash / หมายเหตุ', value: proof }
}

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
  extra?: ReactNode
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
  extra,
}: AdminOrderCardProps) {
  return (
    <div className="border-b border-[#eee] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold tabular-nums text-[#333]">
            {amount.toLocaleString()} ฿
          </div>
          {username && <div className="truncate text-base text-[#888]">@{username}</div>}
          {fee !== undefined && fee > 0 && (
            <div className="text-base text-[#888]">ค่าธรรมเนียม {fee.toLocaleString()} ฿</div>
          )}
          <div className="mt-2 inline-flex min-w-[88px] items-center justify-center rounded-lg bg-[#1E88FF] px-3 py-1 text-base text-white">
            {statusText}
          </div>
        </div>
        <div className="shrink-0 text-right text-lg font-semibold text-[#00BE7D]">
          {formatTimestamp(createtime)}
        </div>
      </div>

      {extra}

      {adminNote && (
        <p className="mt-2 text-base text-[#666]">หมายเหตุ: {adminNote}</p>
      )}
      {pending && onApprove && onReject && (
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            disabled={actionId === orderId}
            onClick={onApprove}
            className="flex-1 rounded-xl bg-[#148164] py-3 text-base font-medium text-white disabled:opacity-60"
          >
            อนุมัติ
          </button>
          <button
            type="button"
            disabled={actionId === orderId}
            onClick={onReject}
            className="flex-1 rounded-xl bg-[#ee5b5a] py-3 text-base font-medium text-white disabled:opacity-60"
          >
            ปฏิเสธ
          </button>
        </div>
      )}
    </div>
  )
}

function DepositDetails({ row }: { row: AdminDepositOrder }) {
  const proof = formatDepositProof(row.proofImage)
  const channelLabel = row.channelType ? CHANNEL_LABEL[row.channelType] : undefined

  if (!channelLabel && !row.channelName && !row.payerName && !proof) return null

  return (
    <dl className="mt-3 space-y-1.5 rounded-xl bg-[#f8faff] px-3 py-2.5 text-sm text-[#535867]">
      {(channelLabel || row.channelName) && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#888]">ช่องทาง</dt>
          <dd className="text-right">
            {[channelLabel, row.channelName].filter(Boolean).join(' · ')}
          </dd>
        </div>
      )}
      {row.payerName && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#888]">ชื่อผู้โอน</dt>
          <dd className="text-right font-medium">{row.payerName}</dd>
        </div>
      )}
      {proof && (
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-[#888]">{proof.label}</dt>
          <dd className="break-all text-right">
            {proof.href ? (
              <a
                href={proof.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#4e72f3] underline"
              >
                {proof.value}
              </a>
            ) : (
              proof.value
            )}
          </dd>
        </div>
      )}
    </dl>
  )
}

function WithdrawDetails({ row }: { row: AdminWithdrawOrder }) {
  const isCrypto = row.withdrawType === 'crypto'
  if (!row.bankName && !row.bankCard && !row.bankUsername && !row.withdrawType) return null

  return (
    <dl className="mt-3 space-y-1.5 rounded-xl bg-[#f8faff] px-3 py-2.5 text-sm text-[#535867]">
      <div className="flex justify-between gap-3">
        <dt className="text-[#888]">ประเภท</dt>
        <dd className="text-right">{isCrypto ? 'คริปโต' : 'ธนาคาร'}</dd>
      </div>
      {row.bankUsername && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#888]">{isCrypto ? 'ชื่อกระเป๋า' : 'ชื่อบัญชี'}</dt>
          <dd className="text-right font-medium">{row.bankUsername}</dd>
        </div>
      )}
      {row.bankName && !isCrypto && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#888]">ธนาคาร</dt>
          <dd className="text-right">{row.bankName}</dd>
        </div>
      )}
      {row.bankCard && (
        <div className="flex justify-between gap-3">
          <dt className="text-[#888]">{isCrypto ? 'ที่อยู่' : 'เลขบัญชี'}</dt>
          <dd className="break-all text-right font-mono text-xs">{row.bankCard}</dd>
        </div>
      )}
    </dl>
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
      extra={<DepositDetails row={row} />}
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
      extra={<WithdrawDetails row={row} />}
    />
  )
}
