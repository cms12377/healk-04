import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const SCROLL_ROW_HINT = 'เลื่อนซ้าย–ขวาเพื่อดูรายละเอียดแต่ละแถว'

export interface ScrollRowColumn<T> {
  key: string
  label: string
  width: string
  align?: 'left' | 'right' | 'center'
  headerClassName?: string
  cellClassName?: string
  render: (row: T) => ReactNode
}

interface ScrollRowTableProps<T> {
  rows: T[]
  columns: ScrollRowColumn<T>[]
  getRowKey: (row: T) => string | number
  getRowClassName?: (row: T) => string | undefined
  className?: string
}

const CELL = 'shrink-0 px-3 py-2.5 flex items-center'

function alignClass(align: ScrollRowColumn<unknown>['align']) {
  if (align === 'right') return 'justify-end text-right'
  if (align === 'center') return 'justify-center text-center'
  return 'justify-start text-left'
}

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[52px] items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function ScrollRowTable<T>({
  rows,
  columns,
  getRowKey,
  getRowClassName,
  className,
}: ScrollRowTableProps<T>) {
  return (
    <div
      className={cn(
        'mx-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      <div className="overflow-x-auto scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden">
        <div className="min-w-max">
          <div className="flex border-b border-[#eee] bg-[#f8f9fa] text-xs font-semibold text-[#646566]">
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  CELL,
                  col.width,
                  alignClass(col.align),
                  col.headerClassName,
                )}
              >
                {col.label}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={getRowKey(row)}
              className={cn(
                'flex border-b border-[#eee] text-sm text-[#2c3345] last:border-0',
                getRowClassName?.(row),
              )}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    CELL,
                    col.width,
                    alignClass(col.align),
                    col.cellClassName,
                  )}
                >
                  {col.render(row)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ScrollRowTableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-3 animate-pulse overflow-hidden rounded-xl bg-white ring-1 ring-black/5',
        className,
      )}
    >
      <div className="h-10 border-b border-[#eee] bg-[#f8f9fa]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 border-b border-[#eee] last:border-0" />
      ))}
    </div>
  )
}

export function ScrollRowHint({ className }: { className?: string }) {
  return (
    <p className={cn('mx-3 mt-2 text-center text-[11px] text-[#969799]', className)}>
      {SCROLL_ROW_HINT}
    </p>
  )
}
