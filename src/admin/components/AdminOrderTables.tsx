import { parseDepositProof } from '@/lib/memberUploads'
import { orderStatusBadgeClass } from '@/lib/statusBadge'
import { formatTimestamp } from '@/services/wallet'
import {
  ScrollRowTable,
  StatusBadge,
  type ScrollRowColumn,
} from '@/components/common/ScrollRowTable'
import type { AdminDepositOrder, AdminWithdrawOrder } from '@/types'

const CHANNEL_LABEL: Record<string, string> = {
  bank: 'ธนาคาร',
  crypto: 'คริปโต',
}

interface AdminDepositTableProps {
  rows: AdminDepositOrder[]
  showUsername: boolean
  actionId: number | null
  onReview: (id: number, action: 'approve' | 'reject') => void
  className?: string
}

interface AdminWithdrawTableProps {
  rows: AdminWithdrawOrder[]
  showUsername: boolean
  actionId: number | null
  onReview: (id: number, action: 'approve' | 'reject') => void
  className?: string
}

function reviewActions(
  row: { id: number; status: string },
  actionId: number | null,
  onReview: (id: number, action: 'approve' | 'reject') => void,
) {
  if (row.status !== 'pending') return <span className="text-xs text-[#969799]">—</span>
  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={actionId === row.id}
        onClick={() => onReview(row.id, 'approve')}
        className="rounded-lg bg-[#148164] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
      >
        อนุมัติ
      </button>
      <button
        type="button"
        disabled={actionId === row.id}
        onClick={() => onReview(row.id, 'reject')}
        className="rounded-lg bg-[#ee5b5a] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
      >
        ปฏิเสธ
      </button>
    </div>
  )
}

function buildDepositColumns(
  showUsername: boolean,
  actionId: number | null,
  onReview: (id: number, action: 'approve' | 'reject') => void,
): ScrollRowColumn<AdminDepositOrder>[] {
  const cols: ScrollRowColumn<AdminDepositOrder>[] = []

  if (showUsername) {
    cols.push({
      key: 'username',
      label: 'สมาชิก',
      width: 'w-[96px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate" title={row.username}>
          @{row.username}
        </span>
      ),
    })
  }

  cols.push(
    {
      key: 'amount',
      label: 'ยอดฝาก',
      width: 'w-[96px]',
      align: 'right',
      cellClassName: 'font-semibold tabular-nums text-[#4e72f3]',
      render: (row) => <>฿{row.amount.toLocaleString()}</>,
    },
    {
      key: 'channel',
      label: 'ช่องทาง',
      width: 'w-[100px]',
      cellClassName: 'text-[#646566]',
      render: (row) => {
        const type = row.channelType ? CHANNEL_LABEL[row.channelType] : undefined
        return [type, row.channelName].filter(Boolean).join(' · ') || '—'
      },
    },
    {
      key: 'payer',
      label: 'ผู้โอน',
      width: 'w-[96px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate" title={row.payerName}>
          {row.payerName ?? '—'}
        </span>
      ),
    },
    {
      key: 'slip',
      label: 'สลิป',
      width: 'w-[72px]',
      render: (row) => {
        const parsed = parseDepositProof(row.proofImage)
        if (!parsed?.slipUrl) return <span className="text-[#969799]">—</span>
        return (
          <a
            href={parsed.slipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#4e72f3] underline"
          >
            ดู
          </a>
        )
      },
    },
    {
      key: 'note',
      label: 'หมายเหตุ',
      width: 'w-[120px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate text-xs" title={row.adminNote}>
          {row.adminNote ?? '—'}
        </span>
      ),
    },
    {
      key: 'time',
      label: 'เวลา',
      width: 'w-[120px]',
      align: 'right',
      cellClassName: 'text-xs text-[#969799]',
      render: (row) => formatTimestamp(row.createtime),
    },
    {
      key: 'status',
      label: 'สถานะ',
      width: 'w-[88px]',
      render: (row) => (
        <StatusBadge label={row.statusText} className={orderStatusBadgeClass(row.status)} />
      ),
    },
    {
      key: 'actions',
      label: 'ดำเนินการ',
      width: 'w-[132px]',
      render: (row) => reviewActions(row, actionId, onReview),
    },
  )

  return cols
}

function buildWithdrawColumns(
  showUsername: boolean,
  actionId: number | null,
  onReview: (id: number, action: 'approve' | 'reject') => void,
): ScrollRowColumn<AdminWithdrawOrder>[] {
  const cols: ScrollRowColumn<AdminWithdrawOrder>[] = [
    {
      key: 'status',
      label: 'สถานะ',
      width: 'w-[88px]',
      render: (row) => (
        <StatusBadge label={row.statusText} className={orderStatusBadgeClass(row.status)} />
      ),
    },
  ]

  if (showUsername) {
    cols.push({
      key: 'username',
      label: 'สมาชิก',
      width: 'w-[96px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate" title={row.username}>
          @{row.username}
        </span>
      ),
    })
  }

  cols.push(
    {
      key: 'amount',
      label: 'ยอดถอน',
      width: 'w-[96px]',
      align: 'right',
      cellClassName: 'font-semibold tabular-nums text-[#4e72f3]',
      render: (row) => <>฿{row.amount.toLocaleString()}</>,
    },
    {
      key: 'fee',
      label: 'ค่าธรรมเนียม',
      width: 'w-[88px]',
      align: 'right',
      cellClassName: 'tabular-nums text-[#646566]',
      render: (row) => (row.fee > 0 ? `฿${row.fee.toLocaleString()}` : '—'),
    },
    {
      key: 'type',
      label: 'ประเภท',
      width: 'w-[80px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (row.withdrawType === 'crypto' ? 'คริปโต' : 'ธนาคาร'),
    },
    {
      key: 'account',
      label: 'บัญชี/ที่อยู่',
      width: 'w-[140px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate font-mono text-xs" title={row.bankCard}>
          {row.bankCard ?? '—'}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'ชื่อ',
      width: 'w-[96px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate" title={row.bankUsername}>
          {row.bankUsername ?? '—'}
        </span>
      ),
    },
    {
      key: 'bank',
      label: 'ธนาคาร',
      width: 'w-[88px]',
      cellClassName: 'text-[#646566]',
      render: (row) => row.bankName ?? '—',
    },
    {
      key: 'note',
      label: 'หมายเหตุ',
      width: 'w-[120px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate text-xs" title={row.adminNote}>
          {row.adminNote ?? '—'}
        </span>
      ),
    },
    {
      key: 'time',
      label: 'เวลา',
      width: 'w-[120px]',
      align: 'right',
      cellClassName: 'text-xs text-[#969799]',
      render: (row) => formatTimestamp(row.createtime),
    },
    {
      key: 'actions',
      label: 'ดำเนินการ',
      width: 'w-[132px]',
      render: (row) => reviewActions(row, actionId, onReview),
    },
  )

  return cols
}

export function AdminDepositTable({
  rows,
  showUsername,
  actionId,
  onReview,
  className,
}: AdminDepositTableProps) {
  return (
    <ScrollRowTable
      rows={rows}
      columns={buildDepositColumns(showUsername, actionId, onReview)}
      getRowKey={(row) => row.id}
      className={className}
    />
  )
}

export function AdminWithdrawTable({
  rows,
  showUsername,
  actionId,
  onReview,
  className,
}: AdminWithdrawTableProps) {
  return (
    <ScrollRowTable
      rows={rows}
      columns={buildWithdrawColumns(showUsername, actionId, onReview)}
      getRowKey={(row) => row.id}
      className={className}
    />
  )
}
