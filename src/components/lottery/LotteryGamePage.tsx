import { List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { GamePickerPopup } from '@/components/game/GamePickerPopup'
import { HomeSideDrawer } from '@/components/home/HomeSideDrawer'
import { BetConfirmModal } from '@/components/lottery/game/BetConfirmModal'
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
  onRuleClick: _onRuleClick,
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
  const [drawing, setDrawing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeGroup, setActiveGroup] = useState(0)
  const [selected, setSelected] = useState<SelectedBetItem[]>([])
  const [amount, setAmount] = useState('')
  const [activeChip, setActiveChip] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
          setDrawing(issue.closed)
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
    setActiveChip(null)
  }, [code])

  useEffect(() => {
    if (!lottery) return
    const timer = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setClosed(true)
          setDrawing(true)
          return 0
        }
        setClosed(false)
        setDrawing(false)
        return c - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lottery?.id])

  const toggleBet = (option: BetOption, groupName: string, categoryName?: string) => {
    setSelected((prev) => {
      const exists = prev.find((b) => b.option.id === option.id)
      if (exists) return prev.filter((b) => b.option.id !== option.id)
      const betAmount = Number(amount) || 10
      return [...prev, { option, groupName, categoryName, amount: betAmount }]
    })
  }

  const betAmount = Number(amount) || 0
  const total = calcBetTotal(betAmount, selected.length)

  const addChip = (chip: number) => {
    setActiveChip(chip)
    setAmount(String((Number(amount) || 0) + chip))
  }

  const openConfirm = () => {
    if (!isLoggedIn) {
      onLoginClick()
      return
    }
    if (closed) {
      setMessage('ปิดรับแทงแล้ว รอรอบถัดไป')
      return
    }
    if (selected.length === 0) {
      setMessage('กรุณาเลือกรายการเดิมพัน')
      return
    }
    if (!betAmount || betAmount <= 0) {
      setMessage('กรุณาระบุจำนวนเงิน')
      return
    }
    if (user!.balance < total) {
      setMessage('ยอดเงินไม่เพียงพอ')
      return
    }
    setShowConfirm(true)
  }

  const submitBet = async () => {
    if (!lottery || !currentIssue) {
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
          categoryName: s.categoryName ?? s.groupName,
          odds: s.option.odds,
          playItemId: s.option.playItemId,
        })),
      )
      await refreshUser()
      setMessage(`✅ เดิมพันสำเร็จ ${selected.length} รายการ รวม ${total.toLocaleString()} ฿`)
      setSelected([])
      setShowConfirm(false)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'เดิมพันไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  const clearBets = () => {
    setSelected([])
    setAmount('')
    setActiveChip(null)
    setMessage('')
  }

  if (!lottery) {
    return (
      <div className="min-h-screen bg-[#f5f5f9]">
        <PageNavBar title="กำลังโหลด..." showBack onBack={onBack} />
      </div>
    )
  }

  const title = GAME_LABELS[code] ?? lottery.name

  return (
    <div className="min-h-screen bg-[#f5f5f9] pb-[150px]">
      <PageNavBar
        title={title}
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
        drawing={drawing}
        lastDraw={history[0]}
        history={history}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onFullHistory={() => onHistoryClick(lottery.id, code)}
      />

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
        activeChip={activeChip}
        onAmountChange={(v) => {
          setAmount(v)
          setActiveChip(null)
        }}
        onChipAdd={addChip}
        onClear={clearBets}
        onSubmit={openConfirm}
        submitting={submitting}
        selectedCount={selected.length}
        total={total}
        closed={closed}
      />

      <BetConfirmModal
        open={showConfirm}
        bets={selected}
        amount={betAmount}
        total={total}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => void submitBet()}
        confirming={submitting}
      />

      {message && (
        <div
          className="fixed left-1/2 top-1/2 z-[999] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/50 px-6 py-4 text-lg text-white"
          onClick={() => setMessage('')}
        >
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
