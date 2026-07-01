import { formatTimestamp } from '@/services/wallet'
import { betStatusBadge } from '@/lib/statusBadge'
import {
  ScrollRowTable,
  ScrollRowTableSkeleton,
  StatusBadge,
  type ScrollRowColumn,
} from '@/components/common/ScrollRowTable'

export interface BetHistoryRowData {
  id: number
  status: string
  isWin?: string | null
  gamesName?: string
  issue: string
  betContent: string
  categoryName?: string
  amount: number
  winAmount: number
  createtime: number
  username?: string
}

interface BetHistoryTableProps {
  rows: BetHistoryRowData[]
  showGame?: boolean
  showUsername?: boolean
  className?: string
}

function buildColumns(
  showGame: boolean,
  showUsername: boolean,
): ScrollRowColumn<BetHistoryRowData>[] {
  const cols: ScrollRowColumn<BetHistoryRowData>[] = [
    {
      key: 'outcome',
      label: 'สถานะ',
      width: 'w-[76px]',
      render: (row) => {
        const badge = betStatusBadge(row.status, row.isWin)
        return <StatusBadge label={badge.label} className={badge.className} />
      },
    },
  ]

  if (showGame) {
    cols.push({
      key: 'game',
      label: 'เกม',
      width: 'w-[108px]',
      render: (row) => (
        <span className="truncate" title={row.gamesName}>
          {row.gamesName ?? '—'}
        </span>
      ),
    })
  }

  cols.push(
    {
      key: 'issue',
      label: 'งวด',
      width: 'w-[88px]',
      render: (row) => (
        <span className="truncate tabular-nums" title={row.issue}>
          {row.issue}
        </span>
      ),
    },
    {
      key: 'bet',
      label: 'เลือก',
      width: 'w-[140px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate" title={row.betContent}>
          {row.betContent}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'ประเภท',
      width: 'w-[88px]',
      cellClassName: 'text-[#646566]',
      render: (row) => (
        <span className="truncate" title={row.categoryName}>
          {row.categoryName ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'ยอดเดิมพัน',
      width: 'w-[88px]',
      align: 'right',
      cellClassName: 'font-semibold tabular-nums',
      render: (row) => <>฿{row.amount.toLocaleString()}</>,
    },
    {
      key: 'win',
      label: 'ได้รับ',
      width: 'w-[88px]',
      align: 'right',
      render: (row) => {
        const outcome = betStatusBadge(row.status, row.isWin)
        const isWin = outcome.label === 'ชนะ'
        return (
          <span
            className={`font-semibold tabular-nums ${isWin ? 'text-[#2e7d32]' : 'text-[#969799]'}`}
          >
            {isWin && row.winAmount > 0 ? `฿${row.winAmount.toLocaleString()}` : '—'}
          </span>
        )
      },
    },
  )

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

  cols.push({
    key: 'time',
    label: 'เวลา',
    width: 'w-[120px]',
    align: 'right',
    cellClassName: 'text-xs text-[#969799]',
    render: (row) => formatTimestamp(row.createtime),
  })

  return cols
}

export function BetHistoryTable({
  rows,
  showGame = true,
  showUsername = false,
  className,
}: BetHistoryTableProps) {
  const columns = buildColumns(showGame, showUsername)
  return (
    <ScrollRowTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      className={className}
    />
  )
}

export { ScrollRowTableSkeleton as BetHistoryTableSkeleton }
