import { List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { GamePickerPopup } from '@/components/game/GamePickerPopup'
import { HomeSideDrawer } from '@/components/home/HomeSideDrawer'
import { GameBetArea } from '@/components/lottery/game/GameBetArea'
import { GameBottomBar } from '@/components/lottery/game/GameBottomBar'
import { GameDrawPanel } from '@/components/lottery/game/BallViews'
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
import type { BetOption, LotteryItem, SelectedBetItem, SubPage } from '@/types'

interface LotteryGamePageProps {
  code: string
  onBack: () => void
  onLoginClick: () => void
  onHistoryClick: (gameId: number, code: string) => void
  onRuleClick: (gameId: number, code: string) => void
  onSwitchGame: (item: LotteryItem) => void
  onNavigateSub: (page: SubPage, params?: Record<string, string>) => void
  onServiceClick: () => void
}

export function LotteryGamePage({
  code,
  onBack,
  onLoginClick,
  onHistoryClick,
  onRuleClick,
  onSwitchGame,
  onNavigateSub,
  onServiceClick,
}: LotteryGamePageProps) {
  const { isLoggedIn, user, refreshUser } = useAuth()
  const [showDrawer, setShowDrawer] = useState(false)
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

  if (!lottery) {
    return (
      <div className="min-h-screen bg-[#f5f5f9]">
        <PageNavBar title="กำลังโหลด..." showBack onBack={onBack} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f9] pb-[150px]">
      <PageNavBar
        title={GAME_LABELS[code] ?? lottery.name}
        showBack
        onBack={onBack}
        onTitleClick={() => setShowPicker(true)}
        onRightClick={() => setShowDrawer(true)}
        rightIcon={<List className="h-[23px] w-[23px] text-white" strokeWidth={2} />}
      />

      <GameDrawPanel
        code={code}
        currentIssue={currentIssue}
        prevIssue={prevIssue}
        countdown={countdown}
        closed={closed}
        lastDraw={history[0]}
        history={history}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onFullHistory={() => onHistoryClick(lottery.id, code)}
      />

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

      <GameBetArea
        code={code}
        betGroups={betGroups}
        activeGroup={activeGroup}
        onActiveGroup={setActiveGroup}
        selected={selected}
        onToggleBet={toggleBet}
      />

      <GameBottomBar
        balance={isLoggedIn ? user!.balance.toLocaleString() : '-'}
        amount={amount}
        onAmountChange={setAmount}
        onClear={clearBets}
        onSubmit={() => void submitBet()}
        submitting={submitting}
        selectedCount={selected.length}
        total={total}
        closed={closed}
      />

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

      <HomeSideDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onNavigate={onNavigateSub}
        onServiceClick={onServiceClick}
      />
    </div>
  )
}
