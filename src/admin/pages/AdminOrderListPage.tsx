import { useCallback, useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import {
  AdminDepositCard,
  AdminWithdrawCard,
} from '@/admin/components/AdminOrderCard'
import {
  AdminListSummary,
  AdminLoadMore,
  AdminStatusTabs,
} from '@/admin/components/AdminStatusTabs'
import {
  ADMIN_BET_STATUS_TABS,
  ADMIN_STATUS_TABS,
  adminFindMemberById,
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
  username: usernameProp,
  onBack,
}: AdminOrderListPageProps) {
  const [status, setStatus] = useState<AdminOrderStatus>('all')
  const [page, setPage] = useState(1)
  const [deposits, setDeposits] = useState<AdminDepositOrder[]>([])
  const [withdraws, setWithdraws] = useState<AdminWithdrawOrder[]>([])
  const [bets, setBets] = useState<AdminBetRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [actionId, setActionId] = useState<number | null>(null)
  const [resolvedUsername, setResolvedUsername] = useState(usernameProp ?? '')

  useEffect(() => {
    if (usernameProp) {
      setResolvedUsername(usernameProp)
      return
    }
    if (!userId) {
      setResolvedUsername('')
      return
    }
    adminFindMemberById(userId)
      .then((m) => {
        if (m) setResolvedUsername(m.username)
      })
      .catch(() => {})
  }, [userId, usernameProp])

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (kind === 'deposit') {
        const res = await adminListDeposits(status, pageNum, userId)
        setTotal(res.total)
        setDeposits((prev) => (append ? [...prev, ...res.data] : res.data))
        return res.data.length < res.limit
      }
      if (kind === 'withdraw') {
        const res = await adminListWithdraws(status, pageNum, userId)
        setTotal(res.total)
        setWithdraws((prev) => (append ? [...prev, ...res.data] : res.data))
        return res.data.length < res.limit
      }
      const res = await adminListBets(status, pageNum, userId)
      setTotal(res.total)
      setBets((prev) => (append ? [...prev, ...res.data] : res.data))
      return res.data.length < res.limit
    },
    [kind, status, userId],
  )

  useEffect(() => {
    let cancelled = false
    const loadFirst = async () => {
      setLoading(true)
      setError('')
      setDeposits([])
      setWithdraws([])
      setBets([])
      setFinished(false)
      setPage(1)
      try {
        const done = await fetchPage(1, false)
        if (!cancelled) {
          setFinished(done)
          setPage(2)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
          setFinished(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadFirst()
    return () => {
      cancelled = true
    }
  }, [status, kind, userId, fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || finished || page < 2) return
    setLoading(true)
    setError('')
    try {
      const done = await fetchPage(page, true)
      setFinished(done)
      setPage((p) => p + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [fetchPage, page, loading, finished])

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    setDeposits([])
    setWithdraws([])
    setBets([])
    setFinished(false)
    setPage(1)
    try {
      const done = await fetchPage(1, false)
      setFinished(done)
      setPage(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  const handleReview = async (orderId: number, action: 'approve' | 'reject') => {
    const note =
      action === 'reject'
        ? (window.prompt('หมายเหตุการปฏิเสธ (ไม่บังคับ):') ?? undefined)
        : undefined
    setActionId(orderId)
    try {
      if (kind === 'deposit') {
        await adminReviewDeposit(orderId, action, note)
      } else if (kind === 'withdraw') {
        await adminReviewWithdraw(orderId, action, note)
      }
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setActionId(null)
    }
  }

  const tabs = kind === 'bet' ? ADMIN_BET_STATUS_TABS : ADMIN_STATUS_TABS
  const subtitle = resolvedUsername ? ` — ${resolvedUsername}` : ''
  const loadedCount = kind === 'deposit' ? deposits.length : kind === 'withdraw' ? withdraws.length : bets.length
  const isEmpty = !loading && loadedCount === 0 && !error

  return (
    <div className="min-h-dvh bg-[#f5f5f5] pb-8 pt-[60px]">
      <div className="fixed top-0 z-[1000] w-full">
        <PageNavBar title={`${title}${subtitle}`} showBack onBack={onBack} />
      </div>

      <AdminStatusTabs tabs={tabs} value={status} onChange={setStatus} />
      <AdminListSummary loaded={loadedCount} total={total} label="แสดง" />

      {error && (
        <div className="mx-2.5 mt-2 rounded-lg bg-[#fff3f3] px-3 py-2 text-center text-sm text-[#ee0a24]">
          {error}
          <button
            type="button"
            onClick={() => void reload()}
            className="ml-2 text-[#427ffa] underline"
          >
            ลองใหม่
          </button>
        </div>
      )}

      <div className="mt-2.5">
        {kind === 'deposit' &&
          deposits.map((row) => (
            <AdminDepositCard
              key={row.id}
              row={row}
              showUsername={!userId}
              actionId={actionId}
              onReview={(id, action) => void handleReview(id, action)}
            />
          ))}

        {kind === 'withdraw' &&
          withdraws.map((row) => (
            <AdminWithdrawCard
              key={row.id}
              row={row}
              showUsername={!userId}
              actionId={actionId}
              onReview={(id, action) => void handleReview(id, action)}
            />
          ))}

        {kind === 'bet' &&
          bets.map((row) => (
            <div key={row.id} className="border-b border-[#eee] bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 p-2.5 text-left"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[20px] font-semibold text-[#333]">
                    {row.amount.toLocaleString()}
                  </div>
                  <div className="mt-1.5 inline-flex min-w-[70px] items-center justify-center rounded-[7.5px] bg-[#1E88FF] px-1.5 py-0.5 text-[14px] text-white">
                    {row.statusText}
                  </div>
                  <div className="mt-1 text-xs text-[#888]">งวด {row.drawNumber}</div>
                  {!userId && <div className="text-xs text-[#888]">@{row.username}</div>}
                </div>
                <div className="shrink-0 text-right text-[16px] font-semibold text-[#00BE7D]">
                  {formatTimestamp(row.createtime)}
                </div>
              </button>
              {expandedId === row.id && (
                <div className="border-t border-[#eee] px-3 pb-3 text-xs leading-relaxed text-[#666]">
                  <p>เกม: {row.gamesName}</p>
                  <p>ยอดเดิมพัน: {row.betAmount.toLocaleString()}</p>
                  <p>เท่า: {row.multiple}</p>
                  <p>เลือก: {row.number}</p>
                  {row.position && <p>ประเภท: {row.position}</p>}
                  <p>ชนะ: {row.winAmount.toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}
      </div>

      <AdminLoadMore
        loading={loading}
        finished={finished}
        empty={isEmpty}
        onLoadMore={() => void loadMore()}
      />
    </div>
  )
}
