import { betOutcomeBadgeClass, betOutcomeLabel, resolveBetOutcome } from '@/lib/betOutcome'

const ORDER_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-[#fff8e6] text-[#e65100]',
  '0': 'bg-[#fff8e6] text-[#e65100]',
  approved: 'bg-[#e8f5e9] text-[#2e7d32]',
  '1': 'bg-[#e8f5e9] text-[#2e7d32]',
  rejected: 'bg-[#ffebee] text-[#c62828]',
  '2': 'bg-[#ffebee] text-[#c62828]',
}

export function orderStatusBadgeClass(status: string): string {
  return ORDER_STATUS_CLASS[status] ?? 'bg-[#eceff1] text-[#546e7a]'
}

export function betStatusBadge(status: string, isWin?: string | null) {
  const outcome = resolveBetOutcome(status, isWin)
  return {
    label: betOutcomeLabel(outcome),
    className: betOutcomeBadgeClass(outcome),
  }
}

export const IDENTITY_STATUS_LABEL: Record<string, string> = {
  pending: 'รอตรวจ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  none: 'ยังไม่ยื่น',
}

export const IDENTITY_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-[#fff8e6] text-[#e65100]',
  approved: 'bg-[#e8f5e9] text-[#2e7d32]',
  rejected: 'bg-[#ffebee] text-[#c62828]',
  none: 'bg-[#eceff1] text-[#546e7a]',
}
