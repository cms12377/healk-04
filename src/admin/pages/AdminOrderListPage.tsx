import { useCallback, useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { AdminStatusTabs } from '@/admin/components/AdminStatusTabs'
import {
  ADMIN_BET_STATUS_TABS,
  ADMIN_STATUS_TABS,
  adminListBets,
  adminListDeposits,
  adminListWithdraws,
  adminReviewDeposit,
  adminReviewWithdraw,
} from '@/services/admin'
import { formatTimestamp } from '@/services/wallet'
import type {
  AdminBetRecord,
  AdminDepositOrder,
  AdminOrderStatus,
  AdminWithdrawOrder,
} from '@/types'
import { cn } from '@/lib/utils'

type OrderKind = 'deposit' | 'withdraw' | 'bet'

interface AdminOrderListPageProps {
  kind: OrderKind
  title: string
  userId?: number
  username?: string
  onBack: () => void
}

export function AdminOrderListPage({
  kind,
  title,
  userId,
  username,
  onBack,
}: AdminOrderListPageProps) {
  const [status, setStatus] = useState<AdminOrderStatus>('all')
  const [page, setPage] = useState(1)
  const [deposits, setDeposits] = useState<AdminDepositOrder[]>([])
  const [withdraws, setWithdraws] = useState<AdminWithdrawOrder[]>([])
  const [bets, setBets] = useState<AdminBetRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [actionId, setActionId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadFirst = async () => {
      setLoading(true)
      setDeposits([])
      setWithdraws([])
      setBets([])
      setFinished(false)
      setPage(1)
      try {
        if (kind === 'deposit') {
          const res = await adminListDeposits(status, 1, userId)
          if (!cancelled) {
            setDeposits(res.data)
            setFinished(res.data.length < res.limit)
            setPage(2)
          }
        } else if (kind === 'withdraw') {
          const res = await adminListWithdraws(status, 1, userId)
          if (!cancelled) {
            setWithdraws(res.data)
            setFinished(res.data.length < res.limit)
            setPage(2)
          }
        } else {
          const res = await adminListBets(status, 1, userId)
          if (!cancelled) {
            setBets(res.data)
            setFinished(res.data.length < res.limit)
            setPage(2)
          }
        }
      } catch {
        if (!cancelled) setFinished(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadFirst()
    return () => {
      cancelled = true
    }
  }, [status, kind, userId])

  const loadMore = useCallback(async () => {
    if (loading || finished || page < 2) return
    setLoading(true)
    try {
      if (kind === 'deposit') {
        const res = await adminListDeposits(status, page, userId)
        setDeposits((prev) => [...prev, ...res.data])
        setFinished(res.data.length < res.limit)
        setPage((p) => p + 1)
      } else if (kind === 'withdraw') {
        const res = await adminListWithdraws(status, page, userId)
        setWithdraws((prev) => [...prev, ...res.data])
        setFinished(res.data.length < res.limit)
        setPage((p) => p + 1)
      } else {
        const res = await adminListBets(status, page, userId)
        setBets((prev) => [...prev, ...res.data])
        setFinished(res.data.length < res.limit)
        setPage((p) => p + 1)
      }
    } catch {
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [kind, status, page, userId, loading, finished])

  const reload = useCallback(async () => {
    setLoading(true)
    setDeposits([])
    setWithdraws([])
    setBets([])
    setFinished(false)
    setPage(1)
    try {
      if (kind === 'deposit') {
        const res = await adminListDeposits(status, 1, userId)
        setDeposits(res.data)
        setFinished(res.data.length < res.limit)
        setPage(2)
      } else if (kind === 'withdraw') {
        const res = await adminListWithdraws(status, 1, userId)
        setWithdraws(res.data)
        setFinished(res.data.length < res.limit)
        setPage(2)
      } else {
        const res = await adminListBets(status, 1, userId)
        setBets(res.data)
        setFinished(res.data.length < res.limit)
        setPage(2)
      }
    } catch {
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [kind, status, userId])

  const handleReview = async (orderId: number, action: 'approve' | 'reject') => {
    setActionId(orderId)
    try {
      if (kind === 'deposit') {
        await adminReviewDeposit(orderId, action)
      } else if (kind === 'withdraw') {
        await adminReviewWithdraw(orderId, action)
      }
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setActionId(null)
    }
  }

  const tabs = kind === 'bet' ? ADMIN_BET_STATUS_TABS : ADMIN_STATUS_TABS
  const subtitle = username ? ` — ${username}` : ''

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5] pb-8">
      <PageNavBar title={`${title}${subtitle}`} showBack onBack={onBack} />
      <AdminStatusTabs tabs={tabs} value={status} onChange={setStatus} />

      <div className="space-y-2 p-2.5">
        {kind === 'deposit' &&
          deposits.map((row) => (
            <div key={row.id} className="rounded-lg bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold text-[#333]">{row.amount.toLocaleString()} ฿</div>
                  {!userId && (
                    <div className="text-xs text-[#888]">@{row.username}</div>
                  )}
                  <div className="text-xs text-[#00BE7D]">{formatTimestamp(row.createtime)}</div>
                </div>
                <span className="rounded-md bg-[#1E88FF] px-2 py-0.5 text-xs text-white">
                  {row.statusText}
                </span>
              </div>
              {row.status === 'pending' && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={actionId === row.id}
                    onClick={() => void handleReview(row.id, 'approve')}
                    className="flex-1 rounded bg-[#148164] py-1.5 text-xs text-white"
                  >
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    disabled={actionId === row.id}
                    onClick={() => void handleReview(row.id, 'reject')}
                    className="flex-1 rounded bg-[#ee5b5a] py-1.5 text-xs text-white"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              )}
            </div>
          ))}

        {kind === 'withdraw' &&
          withdraws.map((row) => (
            <div key={row.id} className="rounded-lg bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-[#333]">{row.amount.toLocaleString()} ฿</div>
                  {!userId && (
                    <div className="text-xs text-[#888]">@{row.username}</div>
                  )}
                  <div className="text-xs text-[#00BE7D]">{formatTimestamp(row.createtime)}</div>
                </div>
                <span className="w-[70px] rounded-md bg-[#1E88FF] px-2 py-0.5 text-center text-xs text-white">
                  {row.statusText}
                </span>
              </div>
              {row.status === 'pending' && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={actionId === row.id}
                    onClick={() => void handleReview(row.id, 'approve')}
                    className="flex-1 rounded bg-[#148164] py-1.5 text-xs text-white"
                  >
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    disabled={actionId === row.id}
                    onClick={() => void handleReview(row.id, 'reject')}
                    className="flex-1 rounded bg-[#ee5b5a] py-1.5 text-xs text-white"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              )}
            </div>
          ))}

        {kind === 'bet' &&
          bets.map((row) => (
            <div key={row.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between p-3 text-left"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <div>
                  <div className="text-sm font-semibold">
                    {row.gamesName} — {row.amount.toLocaleString()} ฿
                  </div>
                  <div className="text-xs text-[#888]">
                    งวด {row.drawNumber} · {row.statusText}
                  </div>
                  {!userId && <div className="text-xs text-[#888]">@{row.username}</div>}
                </div>
                <span className="text-xs text-[#888]">{expandedId === row.id ? '▲' : '▼'}</span>
              </button>
              {expandedId === row.id && (
                <div className="border-t border-[#eee] px-3 pb-3 text-xs text-[#666]">
                  <p>ยอดเดิมพัน: {row.betAmount.toLocaleString()} ฿</p>
                  <p>เท่า: {row.multiple}</p>
                  <p>เลข: {row.number}</p>
                  {row.position && <p>ตำแหน่ง: {row.position}</p>}
                  <p>ชนะ: {row.winAmount.toLocaleString()} ฿</p>
                  <p className="text-[#00BE7D]">{formatTimestamp(row.createtime)}</p>
                </div>
              )}
            </div>
          ))}

        {loading && <p className="py-4 text-center text-sm text-[#888]">กำลังโหลด...</p>}
        {!loading && !finished && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="w-full rounded-lg border border-[#1E88FF] bg-white py-2 text-sm text-[#1E88FF]"
          >
            โหลดเพิ่ม
          </button>
        )}
        {!loading && finished && deposits.length + withdraws.length + bets.length === 0 && (
          <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อมูล</p>
        )}
        {!loading && finished && deposits.length + withdraws.length + bets.length > 0 && (
          <p className={cn('py-2 text-center text-xs text-[#aaa]')}>ไม่มีข้อมูลเพิ่มเติม</p>
        )}
      </div>
    </div>
  )
}
