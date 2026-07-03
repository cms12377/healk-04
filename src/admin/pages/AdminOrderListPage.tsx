import { useCallback, useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import {
  AdminDepositTable,
  AdminWithdrawTable,
} from '@/admin/components/AdminOrderTables'
import {
  AdminLoadMore,
  AdminStatusTabs,
} from '@/admin/components/AdminStatusTabs'
import {
  BetHistoryTable,
  BetHistoryTableSkeleton,
} from '@/components/bet/BetHistoryTable'
import { ScrollRowHint, ScrollRowTableSkeleton } from '@/components/common/ScrollRowTable'
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

const TABLE_CLASS = 'mx-0 rounded-none shadow-none ring-0'

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
  const filterLabel =
    kind === 'deposit'
      ? 'กรองตามสถานะฝาก'
      : kind === 'withdraw'
        ? 'กรองตามสถานะถอน'
        : 'กรองตามผลเดิมพัน'
  const subtitle = resolvedUsername ? ` — ${resolvedUsername}` : ''
  const loadedCount = kind === 'deposit' ? deposits.length : kind === 'withdraw' ? withdraws.length : bets.length
  const isEmpty = !loading && loadedCount === 0 && !error
  const listSummary =
    total > 0
      ? `แสดง ${loadedCount.toLocaleString()} / ${total.toLocaleString()} รายการ`
      : undefined

  return (
    <AdminPageLayout
      title={`${title}${subtitle}`}
      variant="gradient"
      showBack
      onBack={onBack}
    >
      <AdminStatusTabs
        tabs={tabs}
        value={status}
        onChange={setStatus}
        label={filterLabel}
        summary={listSummary}
      />
      <ScrollRowHint className={cn('mx-3 mt-2 text-sm', AD.hint)} />

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
        {loading && loadedCount === 0 && (
          kind === 'bet' ? <BetHistoryTableSkeleton className={TABLE_CLASS} /> : <ScrollRowTableSkeleton className={TABLE_CLASS} />
        )}

        {kind === 'deposit' && deposits.length > 0 && (
          <AdminDepositTable
            rows={deposits}
            showUsername={!userId}
            actionId={actionId}
            onReview={(id, action) => void handleReview(id, action)}
            className={TABLE_CLASS}
          />
        )}

        {kind === 'withdraw' && withdraws.length > 0 && (
          <AdminWithdrawTable
            rows={withdraws}
            showUsername={!userId}
            actionId={actionId}
            onReview={(id, action) => void handleReview(id, action)}
            className={TABLE_CLASS}
          />
        )}

        {kind === 'bet' && bets.length > 0 && (
          <BetHistoryTable
            rows={bets.map((row) => ({
              id: row.id,
              status: row.status,
              isWin: row.isWin,
              gamesName: row.gamesName,
              issue: row.drawNumber,
              betContent: row.number,
              categoryName: row.position,
              amount: row.amount,
              winAmount: row.winAmount,
              createtime: row.createtime,
              username: row.username,
            }))}
            showUsername={!userId}
            className={TABLE_CLASS}
          />
        )}
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
