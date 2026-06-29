import { ChevronDown, ChevronUp, List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { GamePickerPopup } from '@/components/game/GamePickerPopup'
import { GAME_LABELS } from '@/constants/assets'
import { useAuth } from '@/context/AuthContext'
import { fetchLotteries, fetchLotteryByCode } from '@/services/api'
import {
  fetchBetGroups,
  fetchCurrentIssue,
  fetchDrawHistory,
  submitBets,
  type BetGroup,
} from '@/services/lottery'
import { calcBetTotal } from '@/services/lotteryUtils'
import type { BetOption, LotteryItem, SelectedBetItem } from '@/types'
import { cn } from '@/lib/utils'

interface LotteryGamePageProps {
  code: string
  onBack: () => void
  onLoginClick: () => void
  onHistoryClick: (gameId: number, code: string) => void
  onRuleClick: (gameId: number, code: string) => void
  onSwitchGame: (item: LotteryItem) => void
}

function Ball({ n, small }: { n: string; small?: boolean }) {
  const num = Number(n)
  const color =
    num % 3 === 0 ? 'bg-[#006cd5]' : num % 3 === 1 ? 'bg-[#ffa735]' : 'bg-[#54db46]'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold text-white',
        small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm',
        !Number.isNaN(num) && num <= 10 ? color : 'bg-[#3a81e5]',
      )}
    >
      {n}
    </span>
  )
}

export function LotteryGamePage({
  code,
  onBack,
  onLoginClick,
  onHistoryClick,
  onRuleClick,
  onSwitchGame,
}: LotteryGamePageProps) {
  const { isLoggedIn, user, refreshUser } = useAuth()
  const [lottery, setLottery] = useState<LotteryItem | null>(null)
  const [allGames, setAllGames] = useState<LotteryItem[]>([])
  const [betGroups, setBetGroups] = useState<BetGroup[]>([])
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchDrawHistory>>>([])
  const [currentIssue, setCurrentIssue] = useState<string>('')
  const [prevIssue, setPrevIssue] = useState<string>('')
  const [countdown, setCountdown] = useState(0)
  const [closed, setClosed] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeGroup, setActiveGroup] = useState(0)
  const [selected, setSelected] = useState<SelectedBetItem[]>([])
  const [amount, setAmount] = useState('10')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchLotteryByCode(code).then((item) => setLottery(item ?? null))
    fetchLotteries().then(setAllGames)
  }, [code])

  useEffect(() => {
    if (!lottery) return

    void (async () => {
      try {
        const [groups, draws, issue] = await Promise.all([
          fetchBetGroups(lottery.id),
          fetchDrawHistory(lottery.id, 8),
          fetchCurrentIssue(lottery.id),
        ])
        setBetGroups(groups)
        setHistory(draws)
        setPrevIssue(draws[0]?.issue ?? '')
        if (issue) {
          setCurrentIssue(issue.issue)
          setCountdown(issue.secondsLeft)
          setClosed(issue.closed)
          if (issue.quickAmounts[0]) setAmount(issue.quickAmounts[0])
        }
      } catch {
        setBetGroups([])
        setHistory([])
      }
    })()
  }, [lottery])

  useEffect(() => {
    setActiveGroup(0)
    setSelected([])
    setMessage('')
  }, [code])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setClosed(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lottery?.id, countdown])

  const toggleBet = (option: BetOption, groupName: string) => {
    setSelected((prev) => {
      const exists = prev.find((b) => b.option.id === option.id)
      if (exists) return prev.filter((b) => b.option.id !== option.id)
      return [...prev, { option, groupName, amount: Number(amount) || 10 }]
    })
  }

  const total = calcBetTotal(Number(amount) || 0, selected.length)

  const submitBet = async () => {
    if (!isLoggedIn) {
      onLoginClick()
      return
    }
    if (!lottery) return
    if (closed) {
      setMessage('ปิดรับแทงแล้ว รอรอบถัดไป')
      return
    }
    if (selected.length === 0) {
      setMessage('กรุณาเลือกรายการเดิมพัน')
      return
    }
    const betAmount = Number(amount)
    if (!betAmount || betAmount <= 0) {
      setMessage('กรุณาระบุจำนวนเงิน')
      return
    }
    if (user!.balance < total) {
      setMessage('ยอดเงินไม่เพียงพอ')
      return
    }
    if (!currentIssue) {
      setMessage('ไม่พบงวดปัจจุบันในฐานข้อมูล')
      return
    }

    setSubmitting(true)
    try {
      await submitBets(
        lottery.id,
        currentIssue,
        selected.map((s) => ({
          amount: betAmount,
          betContent: s.option.betContent ?? s.option.label,
          label: s.option.label,
          groupName: s.groupName,
          categoryName: s.groupName,
          odds: s.option.odds,
          playItemId: s.option.playItemId,
        })),
      )
      await refreshUser()
      setMessage(`✅ เดิมพันสำเร็จ ${selected.length} รายการ รวม ${total.toLocaleString()} ฿`)
      setSelected([])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'เดิมพันไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  const clearBets = () => {
    setSelected([])
    setAmount('10')
    setMessage('')
  }

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0')
  const secs = String(countdown % 60).padStart(2, '0')
  const lastDraw = history[0]

  if (!lottery) {
    return (
      <div className="min-h-screen bg-[#f5f5f9]">
        <PageNavBar title="กำลังโหลด..." showBack onBack={onBack} />
      </div>
    )
  }

  const currentGroup = betGroups[activeGroup]

  return (
    <div className="min-h-screen bg-[#f5f5f9] pb-[150px]">
      <PageNavBar
        title={GAME_LABELS[code] ?? lottery.name}
        showBack
        onBack={onBack}
        onRightClick={() => setShowPicker(true)}
        rightIcon={<List className="h-[23px] w-[23px] text-white" strokeWidth={2} />}
      />

      <div className="flex bg-white">
        <div className="flex flex-1 flex-col items-center p-3 px-2.5">
          <div className="whitespace-nowrap text-sm text-[#666]">
            <span className="text-[#3a63aa]">{prevIssue.slice(-3) || '---'}</span> งวด
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
            {(lastDraw?.numbers ?? []).map((n, i) => (
              <Ball key={`${lastDraw?.issue}-${i}`} n={n} />
            ))}
            <button type="button" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? (
                <ChevronUp className="h-5 w-5 text-[#666]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#666]" />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center border-l border-[#eee] p-3 py-2.5">
          <div className="whitespace-nowrap text-sm text-[#666]">
            <span className="text-[#3a63aa]">{currentIssue.slice(-3) || '---'}</span> งวด
          </div>
          <div className={cn('mt-1 text-xs', closed ? 'text-[#00bf71]' : 'text-[#d7524e]')}>
            {closed ? 'กำลังออกผล' : 'กำลังรับแทง'}
          </div>
          <div className={cn('text-2xl font-bold', closed ? 'text-[#00bf71]' : 'text-[#d7524e]')}>
            {closed ? 'ออกผล' : `${mins}:${secs}`}
          </div>
        </div>
      </div>

      <div className="flex border-b border-[#eee] bg-white text-xs">
        <button
          type="button"
          onClick={() => onHistoryClick(lottery.id, code)}
          className="flex-1 py-2 text-center text-[#6298d6]"
        >
          ประวัติผล
        </button>
        <button
          type="button"
          onClick={() => onRuleClick(lottery.id, code)}
          className="flex-1 border-l border-[#eee] py-2 text-center text-[#6298d6]"
        >
          กติกาเกม
        </button>
      </div>

      {showHistory && (
        <div className="relative z-[9] bg-white shadow-md">
          <div className="max-h-[200px] overflow-auto">
            {history.length === 0 ? (
              <p className="p-3 text-center text-xs text-[#888]">ยังไม่มีผลออกในฐานข้อมูล</p>
            ) : (
              history.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2 border-b border-[#eee] p-1.5 text-xs"
                >
                  <span className="w-24 shrink-0">{row.issue}期</span>
                  <div className="flex flex-wrap gap-1">
                    {row.numbers.map((n, i) => (
                      <Ball key={`${row.id}-${i}`} n={n} small />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {betGroups.length === 0 ? (
        <p className="p-4 text-center text-sm text-[#888]">
          ไม่พบรายการเดิมพัน — ตรวจสอบ play_groups / play_items ในฐานข้อมูล
        </p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto bg-white px-2 py-2">
            {betGroups.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(i)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 text-sm',
                  activeGroup === i ? 'bg-[#86aeff] text-white' : 'bg-[#f5f5f9] text-[#333]',
                )}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="p-3">
            <div
              className={cn(
                'grid gap-2',
                currentGroup && currentGroup.options.length > 20
                  ? 'grid-cols-5'
                  : currentGroup && currentGroup.options.length > 9
                    ? 'grid-cols-4'
                    : 'grid-cols-3',
              )}
            >
              {currentGroup?.options.map((opt) => {
                const isSelected = selected.some((s) => s.option.id === opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleBet(opt, currentGroup.name)}
                    className={cn(
                      'rounded-lg border p-3 text-center transition-colors',
                      isSelected
                        ? 'border-[#86aeff] bg-[#86aeff] text-white'
                        : 'border-[#e5e5e5] bg-white text-[#333]',
                    )}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className={cn('text-xs', isSelected ? 'text-white/80' : 'text-[#888]')}>
                      {opt.odds}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[700px] -translate-x-1/2 border-t border-[#ccc] bg-[#d6dee9]">
        <div className="flex items-center justify-between bg-white/60 px-2.5 py-2.5">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-[#333]">ยอดเงิน:</div>
              <div className="text-xs font-semibold">
                {isLoggedIn ? user!.balance.toLocaleString() : '-'}
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-[70px] rounded border border-[#ccc] px-1 py-1 text-center text-sm"
            />
            <button
              type="button"
              onClick={clearBets}
              className="rounded bg-[#ffa663] px-2.5 py-1 text-xs text-white"
            >
              ล้าง
            </button>
          </div>
          <button
            type="button"
            onClick={() => void submitBet()}
            disabled={submitting}
            className="flex h-9 w-[75px] items-center justify-center rounded bg-[#7aa6ff] text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? '...' : 'ยืนยัน'}
          </button>
        </div>
        {selected.length > 0 && (
          <div className="bg-[#7aa6ff]/20 px-3 py-1 text-center text-xs text-[#333]">
            เลือก {selected.length} รายการ · รวม {total.toLocaleString()} ฿
          </div>
        )}
      </div>

      {message && (
        <div className="fixed left-1/2 top-1/2 z-[999] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/50 px-6 py-4 text-lg text-white">
          {message}
        </div>
      )}

      <GamePickerPopup
        open={showPicker}
        games={allGames}
        onClose={() => setShowPicker(false)}
        onSelect={onSwitchGame}
      />
    </div>
  )
}
