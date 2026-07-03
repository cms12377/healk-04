import {
  IDENTITY_STATUS_CLASS,
  IDENTITY_STATUS_LABEL,
  orderStatusBadgeClass,
} from '@/lib/statusBadge'
import { formatTimestamp } from '@/services/wallet'
import {
  ScrollRowTable,
  StatusBadge,
  type ScrollRowColumn,
} from '@/components/common/ScrollRowTable'
import { cn } from '@/lib/utils'
import type { AdminIdentityRequest, AdminMember } from '@/types'

const MEMBER_KYC_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'KYC รอ', className: 'bg-[#fff3e6] text-[#e65100]' },
  approved: { label: 'KYC ✓', className: 'bg-[#e8f5e9] text-[#2e7d32]' },
  rejected: { label: 'KYC ✗', className: 'bg-[#ffebee] text-[#c62828]' },
}

interface AdminIdentityTableProps {
  rows: AdminIdentityRequest[]
  actionId: number | null
  onReview: (userId: number, action: 'approve' | 'reject') => void
  className?: string
}

interface AdminMembersTableProps {
  rows: AdminMember[]
  isAdmin: boolean
  onEdit: (member: AdminMember) => void
  onToggleBlock: (member: AdminMember) => void
  onDelete: (member: AdminMember) => void
  className?: string
}

function identityActions(
  row: AdminIdentityRequest,
  actionId: number | null,
  onReview: (userId: number, action: 'approve' | 'reject') => void,
) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={actionId === row.userId}
        onClick={() => onReview(row.userId, 'reject')}
        className={cn(
          'rounded-lg border border-[#ebedf0] px-2 py-1 text-[11px] font-semibold text-[#535867] disabled:opacity-50',
        )}
      >
        ปฏิเสธ
      </button>
      <button
        type="button"
        disabled={actionId === row.userId}
        onClick={() => onReview(row.userId, 'approve')}
        className="rounded-lg bg-[#4e72f3] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
      >
        {actionId === row.userId ? '...' : 'อนุมัติ'}
      </button>
    </div>
  )
}

const identityColumns = (
  actionId: number | null,
  onReview: (userId: number, action: 'approve' | 'reject') => void,
): ScrollRowColumn<AdminIdentityRequest>[] => [
  {
    key: 'status',
    label: 'สถานะ',
    width: 'w-[88px]',
    render: (row) => (
      <StatusBadge
        label={IDENTITY_STATUS_LABEL[row.identityStatus] ?? row.identityStatus}
        className={IDENTITY_STATUS_CLASS[row.identityStatus] ?? orderStatusBadgeClass(row.identityStatus)}
      />
    ),
  },
  {
    key: 'username',
    label: 'สมาชิก',
    width: 'w-[96px]',
    cellClassName: 'font-semibold text-[#4e72f3]',
    render: (row) => row.username,
  },
  {
    key: 'realName',
    label: 'ชื่อจริง',
    width: 'w-[108px]',
    render: (row) => (
      <span className="truncate" title={row.realName}>
        {row.realName || '—'}
      </span>
    ),
  },
  {
    key: 'idNumber',
    label: 'เลขบัตร',
    width: 'w-[140px]',
    cellClassName: 'font-mono text-xs text-[#646566]',
    render: (row) => (
      <span className="truncate" title={row.idNumber}>
        {row.idNumber || '—'}
      </span>
    ),
  },
  {
    key: 'front',
    label: 'ด้านหน้า',
    width: 'w-[72px]',
    render: (row) =>
      row.identityFrontUrl ? (
        <a
          href={row.identityFrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#4e72f3] underline"
        >
          ดู
        </a>
      ) : (
        '—'
      ),
  },
  {
    key: 'back',
    label: 'ด้านหลัง',
    width: 'w-[72px]',
    render: (row) =>
      row.identityBackUrl ? (
        <a
          href={row.identityBackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#4e72f3] underline"
        >
          ดู
        </a>
      ) : (
        '—'
      ),
  },
  {
    key: 'join',
    label: 'สมัคร',
    width: 'w-[120px]',
    cellClassName: 'text-xs text-[#969799]',
    render: (row) => row.jointimeText,
  },
  {
    key: 'actions',
    label: 'ดำเนินการ',
    width: 'w-[132px]',
    render: (row) => identityActions(row, actionId, onReview),
  },
]

const MEMBER_STATUS_BADGE: Record<number, { label: string; className: string }> = {
  1: { label: 'ปกติ', className: 'bg-[#e8f5e9] text-[#2e7d32] ring-1 ring-[#c8e6c9]' },
  0: { label: 'ถูกบล็อก', className: 'bg-[#ffcdd2] text-[#b71c1c] ring-1 ring-[#ef9a9a]' },
}

function memberRowClassName(row: AdminMember): string | undefined {
  if (row.status === 0) {
    return 'bg-[#fff5f5] border-l-4 border-l-[#e53935]'
  }
  return undefined
}

function buildMemberColumns(
  isAdmin: boolean,
  onEdit: (member: AdminMember) => void,
  onToggleBlock: (member: AdminMember) => void,
  onDelete: (member: AdminMember) => void,
): ScrollRowColumn<AdminMember>[] {
  const btn =
    'rounded-lg border border-[#ebedf0] px-2 py-1 text-[11px] font-semibold text-[#535867] hover:bg-[#f8faff]'

  return [
  {
    key: 'status',
    label: 'สถานะ',
    width: 'w-[72px]',
    render: (row) => {
      const badge = MEMBER_STATUS_BADGE[row.status] ?? MEMBER_STATUS_BADGE[1]
      return <StatusBadge label={badge.label} className={badge.className} />
    },
  },
  {
    key: 'username',
    label: 'สมาชิก',
    width: 'w-[108px]',
    cellClassName: 'font-semibold',
    render: (row) => (
      <span className={row.status === 0 ? 'text-[#c62828]' : 'text-[#4e72f3]'}>{row.username}</span>
    ),
  },
  {
    key: 'nickname',
    label: 'ชื่อเล่น',
    width: 'w-[96px]',
    cellClassName: 'text-[#646566]',
    render: (row) => (
      <span className="truncate" title={row.nickname}>
        {row.nickname}
      </span>
    ),
  },
  {
    key: 'kyc',
    label: 'KYC',
    width: 'w-[80px]',
    render: (row) => {
      const badge = row.identityStatus ? MEMBER_KYC_BADGE[row.identityStatus] : undefined
      if (!badge) return '—'
      return <StatusBadge label={badge.label} className={badge.className} />
    },
  },
  {
    key: 'realName',
    label: 'ชื่อจริง',
    width: 'w-[108px]',
    cellClassName: 'text-[#646566]',
    render: (row) => row.realName ?? '—',
  },
  {
    key: 'money',
    label: 'ยอดเงิน',
    width: 'w-[96px]',
    align: 'right',
    cellClassName: 'font-semibold tabular-nums',
    render: (row) => <>฿{row.money.toLocaleString()}</>,
  },
  {
    key: 'join',
    label: 'สมัคร',
    width: 'w-[120px]',
    cellClassName: 'text-xs text-[#969799]',
    render: (row) => row.jointimeText,
  },
  {
    key: 'actions',
    label: 'ดำเนินการ',
    width: 'w-[140px]',
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} onClick={() => onEdit(row)}>
          แก้ไข
        </button>
        <button
          type="button"
          className={cn(
            btn,
            row.status === 0
              ? 'border-[#a5d6a7] bg-[#e8f5e9] text-[#2e7d32]'
              : 'border-[#ffcc80] bg-[#fff8e6] text-[#e65100]',
          )}
          onClick={() => onToggleBlock(row)}
        >
          {row.status === 0 ? 'ปลดบล็อก' : 'บล็อก'}
        </button>
        {isAdmin && (
          <button
            type="button"
            className="rounded-lg bg-[#ffebee] px-2 py-1 text-[11px] font-semibold text-[#c62828]"
            onClick={() => onDelete(row)}
          >
            ลบ
          </button>
        )}
      </div>
    ),
  },
  ]
}

export function AdminIdentityTable({
  rows,
  actionId,
  onReview,
  className,
}: AdminIdentityTableProps) {
  return (
    <ScrollRowTable
      rows={rows}
      columns={identityColumns(actionId, onReview)}
      getRowKey={(row) => row.userId}
      className={className}
    />
  )
}

export function AdminMembersTable({
  rows,
  isAdmin,
  onEdit,
  onToggleBlock,
  onDelete,
  className,
}: AdminMembersTableProps) {
  return (
    <ScrollRowTable
      rows={rows}
      columns={buildMemberColumns(isAdmin, onEdit, onToggleBlock, onDelete)}
      getRowKey={(row) => row.id}
      getRowClassName={memberRowClassName}
      className={className}
    />
  )
}

export function DepositHistoryTable({
  rows,
  className,
}: {
  rows: import('@/types').MemberDepositOrder[]
  className?: string
}) {
  const columns: ScrollRowColumn<import('@/types').MemberDepositOrder>[] = [
    {
      key: 'type',
      label: 'ประเภท',
      width: 'w-[96px]',
      render: (row) => (row.channelType === 'crypto' ? 'ฝากคริปโต' : 'ฝากเงิน'),
    },
    {
      key: 'amount',
      label: 'ยอด',
      width: 'w-[96px]',
      align: 'right',
      cellClassName: 'font-semibold tabular-nums text-[#4e72f3]',
      render: (row) => <>฿{row.amount.toLocaleString()}</>,
    },
    {
      key: 'payer',
      label: 'ผู้โอน',
      width: 'w-[108px]',
      cellClassName: 'text-[#646566]',
      render: (row) => row.payerName ?? '—',
    },
    {
      key: 'note',
      label: 'หมายเหตุ',
      width: 'w-[120px]',
      cellClassName: 'text-xs text-[#e53935]',
      render: (row) => (
        <span className="truncate" title={row.adminNote}>
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
  ]

  return (
    <ScrollRowTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      className={className}
    />
  )
}

export function WalletNotesTable({
  rows,
  className,
}: {
  rows: import('@/types').WalletRecord[]
  className?: string
}) {
  const columns: ScrollRowColumn<import('@/types').WalletRecord>[] = [
    {
      key: 'category',
      label: 'ประเภท',
      width: 'w-[120px]',
      cellClassName: 'font-semibold',
      render: (row) => (
        <span className="truncate" title={row.categoryLabel}>
          {row.categoryLabel}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'รายการ',
      width: 'w-[108px]',
      cellClassName: 'text-[#646566]',
      render: (row) => row.type ?? '—',
    },
    {
      key: 'amount',
      label: 'จำนวน',
      width: 'w-[96px]',
      align: 'right',
      render: (row) => (
        <span
          className={`font-bold tabular-nums ${row.money >= 0 ? 'text-[#4e72f3]' : 'text-[#e53935]'}`}
        >
          {row.money >= 0 ? '+' : ''}฿{row.money.toLocaleString()}
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
  ]

  return (
    <ScrollRowTable rows={rows} columns={columns} getRowKey={(row) => row.id} className={className} />
  )
}
