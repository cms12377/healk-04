import { useCallback, useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
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
import { cn } from '@/lib/utils'
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
    <AdminPageLayout
      title={`${title}${subtitle}`}
      variant="gradient"
      showBack
      onBack={onBack}
    >
      <AdminStatusTabs tabs={tabs} value={status} onChange={setStatus} />
      <AdminListSummary loaded={loadedCount} total={total} label="แสดง" />

      {error && (
        <div className="mx-3 mt-2 rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
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
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-2xl font-semibold tabular-nums text-[#333]">
                    {row.amount.toLocaleString()}
                  </div>
                  <div className="mt-2 inline-flex min-w-[88px] items-center justify-center rounded-lg bg-[#1E88FF] px-3 py-1 text-base text-white">
                    {row.statusText}
                  </div>
                  <div className={cn('mt-2', AD.hint)}>งวด {row.drawNumber}</div>
                  {!userId && <div className={AD.hint}>@{row.username}</div>}
                </div>
                <div className="shrink-0 text-right text-lg font-semibold text-[#00BE7D]">
                  {formatTimestamp(row.createtime)}
                </div>
              </button>
              {expandedId === row.id && (
                <div className={cn('border-t border-[#eee] px-4 pb-4', AD.body, 'space-y-1 leading-relaxed')}>
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
    </AdminPageLayout>
  )
}
