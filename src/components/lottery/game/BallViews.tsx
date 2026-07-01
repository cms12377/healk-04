import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, History } from 'lucide-react'
import type { DrawRecord, LotteryGameType } from '@/types'
import { translateBetLabel, translateZodiacLabel } from '@/lib/gameLabels'
import {
  HISTORY_TABS,
  issuePrev,
  issueShort,
  labelChipClass,
  lucky28Sum,
  markSixBallClass,
  pk10HistoryDragonTiger,
  PK10_BALL_CLASS,
  splitMarkSix,
} from '@/lib/drawDisplay'
import { K3DiceFace } from '@/components/lottery/game/K3DiceFace'
import { formatCountdown } from '@/lib/gameIntervals'
import { getGameType } from '@/services/lotteryUtils'
import { cn } from '@/lib/utils'
import {
  BET_NUM_BOX,
  BET_SIDE_CHIP,
  sideChipClass,
} from '@/components/lottery/game/betStyles'

export function Pk10Ball({ n, small, className }: { n: string; small?: boolean; className?: string }) {
  const num = Number(n)
  const cls = PK10_BALL_CLASS[num] ?? 'bg-[#3a81e5] text-white'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold',
        small ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base',
        cls,
        className,
      )}
    >
      {n}
    </span>
  )
}

export function MarkSixBall({ n, small, className }: { n: string; small?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold',
        small ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base',
        markSixBallClass(n),
        className,
      )}
    >
      {n.padStart(2, '0')}
    </span>
  )
}

export function Lucky28Ball({ n, small }: { n: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-[#4e72f3] bg-white font-bold text-[#4e72f3]',
        small ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base',
      )}
    >
      {n}
    </span>
  )
}

export function SscBall({
  n,
  small,
  highlight,
  className,
}: {
  n: string
  small?: boolean
  highlight?: boolean
  className?: string
}) {
  const num = Number(n)
  const isBig = !Number.isNaN(num) && num >= 5
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-bold',
        small ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base',
        highlight
          ? isBig
            ? 'bg-[#006cd5] text-white shadow-sm'
            : 'bg-[#ffa735] text-white shadow-sm'
          : 'border border-[#4e72f3] bg-white text-[#4e72f3]',
        className,
      )}
    >
      {n}
    </span>
  )
}

function SscResultRow({
  numbers,
  analyz,
  small,
  highlight,
  fitWidth,
}: {
  numbers: string[]
  analyz?: DrawRecord['analyz']
  small?: boolean
  highlight?: boolean
  fitWidth?: boolean
}) {
  const balls = numbers.slice(0, 5)
  const compact = Boolean(small && fitWidth)
  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className={cn('flex flex-nowrap items-center', compact ? 'gap-px' : 'gap-[3px]')}>
        {balls.map((n, i) => (
          <SscBall
            key={`${n}-${i}`}
            n={n}
            small={small}
            highlight={highlight}
            className={compact ? 'h-6 w-6 text-[11px]' : undefined}
          />
        ))}
      </div>
      {highlight && balls.length > 0 && (
        <SscSummaryBadges numbers={balls} analyz={analyz} />
      )}
    </div>
  )
}

function SscSummaryBadges({
  numbers,
  analyz,
}: {
  numbers: string[]
  analyz?: DrawRecord['analyz']
}) {
  const dxList =
    analyz?.dxList ??
    numbers.map((n) => (Number(n) >= 5 ? '大' : '小'))
  const dsList =
    analyz?.dsList ??
    numbers.map((n) => (Number(n) % 2 === 1 ? '单' : '双'))
  const bigCount = dxList.filter((l) => l === '大' || translateBetLabel(l) === 'ใหญ่').length
  const oddCount = dsList.filter((l) => l === '单' || translateBetLabel(l) === 'คี่').length

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <span className="rounded-full bg-[#eef2ff] px-1.5 py-px text-xs font-bold text-[#4e72f3] ring-1 ring-[#4e72f3]/15">
        ใหญ่ {bigCount} · เล็ก {numbers.length - bigCount}
      </span>
      <span className="rounded-full bg-[#fff8e6] px-1.5 py-px text-xs font-bold text-[#e65100] ring-1 ring-[#ffa735]/25">
        คี่ {oddCount} · คู่ {numbers.length - oddCount}
      </span>
      {analyz?.result?.slice(0, 2).map((l, i) => (
        <LabelChip key={`p-${i}`} label={translateBetLabel(l)} small />
      ))}
    </div>
  )
}

export function LabelChip({
  label,
  small,
  compact,
}: {
  label: string
  small?: boolean
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold text-white',
        compact
          ? 'h-6 min-w-6 px-1 text-[10px]'
          : small
            ? 'h-7 min-w-7 px-1.5 text-sm'
            : 'h-8 min-w-8 px-1.5 text-base',
        labelChipClass(label),
      )}
    >
      {translateBetLabel(label)}
    </span>
  )
}

/** th6688 KuaiSan — 6-cell grid: 3 dice + sum + big/small + odd/even */
export function K3KuaiSanGrid({
  numbers,
  analyz,
  compact,
  fitWidth,
}: {
  numbers: string[]
  analyz?: DrawRecord['analyz']
  /** Smaller dice/text for history rows (th6688 type="sime") */
  compact?: boolean
  fitWidth?: boolean
}) {
  const dice = numbers.slice(0, 3)
  const sum = lucky28Sum(dice)
  const dxRaw = analyz?.dx
  const dsRaw = analyz?.ds
  const dx =
    dxRaw === 'big' ? '大' : dxRaw === 'small' ? '小' : dxRaw ?? (sum >= 11 ? '大' : '小')
  const ds =
    dsRaw === 'odd' ? '单' : dsRaw === 'even' ? '双' : dsRaw ?? (sum % 2 === 1 ? '单' : '双')

  const tailCells: { text: string; chipKey: string; kind: 'sum' | 'side' }[] = [
    { text: String(sum), chipKey: String(sum), kind: 'sum' },
    { text: translateBetLabel(dx), chipKey: dx, kind: 'side' },
    { text: translateBetLabel(ds), chipKey: ds, kind: 'side' },
  ]
  const tight = Boolean(compact || fitWidth)

  return (
    <div
      className={cn(
        'grid w-full max-w-full grid-cols-6',
        tight ? 'gap-px' : 'gap-[3px]',
      )}
    >
      {dice.map((n, i) => (
        <div key={`d-${i}-${n}`} className="flex items-center justify-center">
          <K3DiceFace value={n} size={fitWidth ? 'sm' : compact ? 'sm' : 'md'} />
        </div>
      ))}
      {tailCells.map(({ text, chipKey, kind }, i) => (
        <div key={`t-${i}-${text}`} className="flex items-center justify-center">
          {kind === 'sum' ? (
            <span className={cn(BET_NUM_BOX, tight && 'h-6 w-6 text-[11px]')}>{text}</span>
          ) : (
            <span
              className={cn(
                BET_SIDE_CHIP,
                sideChipClass(chipKey),
                tight && 'h-6 min-w-6 px-1 text-[10px]',
              )}
            >
              {text}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function K3Row({
  numbers,
  analyz,
  compact,
}: {
  numbers: string[]
  analyz?: DrawRecord['analyz']
  compact?: boolean
}) {
  return <K3KuaiSanGrid numbers={numbers} analyz={analyz} compact={compact} />
}

export function MarkSixResultRow({
  numbers,
  zodiac,
  small,
  highlightSpecial,
  fitWidth,
}: {
  numbers: string[]
  zodiac?: string[]
  small?: boolean
  highlightSpecial?: boolean
  fitWidth?: boolean
}) {
  const { regular, special } = splitMarkSix(numbers)
  const compact = Boolean(small && fitWidth)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-px',
        !fitWidth && 'justify-center gap-1',
      )}
    >
      {regular.map((n, i) => (
        <MarkSixBall
          key={`r-${i}`}
          n={n}
          small={small}
          className={compact ? 'h-6 w-6 text-[11px]' : undefined}
        />
      ))}
      {special.length > 0 && (
        <>
          <span className="text-xs font-bold text-[#e53935]">+</span>
          <MarkSixBall
            n={special[0]}
            small={small}
            className={
              highlightSpecial
                ? 'scale-110 ring-2 ring-[#e53935] ring-offset-1 shadow-md'
                : undefined
            }
          />
        </>
      )}
      {zodiac && zodiac.length > 0 && (
        <span className="ml-1 text-xs text-[#888]">
          {zodiac.map((z) => translateZodiacLabel(z)).join(' ')}
        </span>
      )}
    </div>
  )
}

export function Lucky28Row({
  numbers,
  labels,
  small,
  highlightSum,
}: {
  numbers: string[]
  labels?: string[]
  small?: boolean
  highlightSum?: boolean
}) {
  const sum = lucky28Sum(numbers)
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {numbers.map((n, i) => (
        <Lucky28Ball key={i} n={n} small={small} />
      ))}
      <span className="text-xs text-[#969799]">=</span>
      <span
        className={cn(
          'font-bold text-[#4e72f3]',
          highlightSum
            ? 'rounded-full bg-[#eef2ff] px-2 py-0.5 text-sm ring-1 ring-[#4e72f3]/25'
            : small
              ? 'text-sm'
              : 'text-base',
        )}
      >
        {sum}
      </span>
      {labels?.map((l, i) => (
        <LabelChip key={i} label={translateBetLabel(l)} small={small} />
      ))}
    </div>
  )
}

export function DrawResultView({
  gameType,
  numbers,
  analyz,
  historyMode,
  small,
  highlight,
  fitWidth,
}: {
  gameType: LotteryGameType
  numbers: string[]
  analyz?: DrawRecord['analyz']
  historyMode?: string
  small?: boolean
  /** Emphasize key stats on the main draw panel (sum, special ball, etc.) */
  highlight?: boolean
  /** History rows — compact layout, no horizontal scroll */
  fitWidth?: boolean
}) {
  if (gameType === 'pk10') {
    if (historyMode === '2' && analyz?.dxList) {
      return (
        <div className={cn('flex flex-wrap', fitWidth ? 'gap-px' : 'gap-1')}>
          {analyz.dxList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} compact={fitWidth} />
          ))}
        </div>
      )
    }
    if (historyMode === '3' && analyz?.dsList) {
      return (
        <div className={cn('flex flex-wrap', fitWidth ? 'gap-px' : 'gap-1')}>
          {analyz.dsList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} compact={fitWidth} />
          ))}
        </div>
      )
    }
    if (historyMode === '4') {
      const dtList = pk10HistoryDragonTiger(numbers, analyz)
      return (
        <div className={cn('flex flex-wrap', fitWidth ? 'gap-px' : 'gap-1')}>
          {dtList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} compact={fitWidth} />
          ))}
        </div>
      )
    }
    return <Pk10NumRow numbers={numbers} small={small} fitWidth={fitWidth} />
  }

  if (gameType === 'k3') {
    return (
      <K3KuaiSanGrid
        numbers={numbers}
        analyz={analyz}
        compact={small}
        fitWidth={fitWidth}
      />
    )
  }

  if (gameType === 'marksix') {
    return (
      <MarkSixResultRow
        numbers={numbers}
        zodiac={analyz?.zodiac}
        small={small}
        highlightSpecial={highlight}
        fitWidth={fitWidth}
      />
    )
  }

  if (gameType === 'lucky28') {
    const labels = [analyz?.dx, analyz?.ds, analyz?.wave].filter(Boolean) as string[]
    return (
      <Lucky28Row
        numbers={numbers.slice(0, 3)}
        labels={labels}
        small={small}
        highlightSum={highlight}
      />
    )
  }

  if (gameType === 'ssc') {
    if (historyMode === '2' && analyz?.dxList) {
      return (
        <div className={cn('flex flex-wrap', fitWidth ? 'gap-px' : 'gap-1')}>
          {analyz.dxList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} compact={fitWidth} />
          ))}
        </div>
      )
    }
    if (historyMode === '3' && analyz?.dsList) {
      return (
        <div className={cn('flex flex-wrap', fitWidth ? 'gap-px' : 'gap-1')}>
          {analyz.dsList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} compact={fitWidth} />
          ))}
        </div>
      )
    }
    if (historyMode === '4' && analyz?.result) {
      return (
        <div className={cn('flex flex-wrap', fitWidth ? 'gap-px' : 'gap-1')}>
          {analyz.result.map((l, i) => (
            <LabelChip key={i} label={l} small={small} compact={fitWidth} />
          ))}
        </div>
      )
    }
    return (
      <SscResultRow
        numbers={numbers}
        analyz={analyz}
        small={small}
        highlight={highlight}
        fitWidth={fitWidth}
      />
    )
  }

  return null
}

interface GameDrawPanelProps {
  code: string
  currentIssue: string
  prevIssue: string
  countdown: number
  closed: boolean
  drawing?: boolean
  lastDraw?: DrawRecord
  history: DrawRecord[]
  showHistory: boolean
  onToggleHistory: () => void
}

/** งวด + เลขงวด ในแถวเดียว (th6688 style) */
function IssueInline({
  label,
  issue,
  className,
  compact,
}: {
  label: string
  issue: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-baseline whitespace-nowrap',
        compact ? 'gap-1' : 'gap-1.5',
        className,
      )}
    >
      <span className={cn('font-semibold text-[#969799]', compact ? 'text-[10px]' : 'text-xs')}>
        {label}
      </span>
      <span
        className={cn(
          'font-bold tabular-nums leading-none text-[#4e72f3]',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        {issue || '—'}
      </span>
    </div>
  )
}

function DrawHistoryChevron({ expanded }: { expanded: boolean }) {
  const Icon = expanded ? ChevronUp : ChevronDown
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4e72f3] ring-1 ring-[#4e72f3]/20">
      <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
    </span>
  )
}

function CountdownBlock({
  showDrawingLabel,
  urgent,
  isDrawing,
  minutes,
  seconds,
}: {
  showDrawingLabel: boolean
  urgent: boolean
  isDrawing: boolean
  minutes: string
  seconds: string
}) {
  if (showDrawingLabel) {
    return <p className="text-xl font-bold text-[#00bf71] sm:text-2xl">กำลังออกผล...</p>
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-0.5 font-bold tabular-nums',
        urgent ? 'text-[#e53935]' : isDrawing ? 'text-[#00bf71]' : 'text-[#2c3345]',
      )}
    >
      <Clock className="mr-0.5 h-5 w-5 opacity-60" strokeWidth={2.2} aria-hidden />
      <span className="min-w-[2ch] text-2xl sm:text-3xl">{minutes}</span>
      <span className="text-2xl opacity-70 sm:text-3xl">:</span>
      <span className="min-w-[2ch] text-2xl sm:text-3xl">{seconds}</span>
    </div>
  )
}

function StatusBadges({ isDrawing, className }: { isDrawing: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <span
        className={cn(
          'inline-block rounded-full px-1.5 py-px text-xs font-semibold',
          isDrawing ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]',
        )}
      >
        {isDrawing ? 'ออกผล' : 'รับแทง'}
      </span>
    </div>
  )
}

export function Pk10NumRow({
  numbers,
  small,
  fitWidth,
}: {
  numbers: string[]
  small?: boolean
  fitWidth?: boolean
}) {
  const compact = Boolean(small && fitWidth)
  return (
    <div
      className={cn(
        'flex flex-nowrap items-center',
        compact ? 'gap-px' : 'gap-[3px]',
        !compact &&
          'overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        small && !compact && 'scale-90',
      )}
    >
      {numbers.map((n, i) => (
        <Pk10Ball
          key={`${n}-${i}`}
          n={n}
          small={small}
          className={cn('shrink-0', compact && 'h-6 w-6 text-[11px]')}
        />
      ))}
    </div>
  )
}

export function Pk10LabelRow({ labels, small }: { labels: string[]; small?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-around gap-1">
      {labels.map((l, i) => (
        <LabelChip key={`${l}-${i}`} label={l} small={small} />
      ))}
    </div>
  )
}

export function GameDrawPanel({
  code,
  currentIssue,
  prevIssue,
  countdown,
  closed,
  drawing = false,
  lastDraw,
  history,
  showHistory,
  onToggleHistory,
}: GameDrawPanelProps) {
  const gameType = getGameType(code)
  const tabs = HISTORY_TABS[gameType]
  const [historyMode, setHistoryMode] = useState('1')

  const { minutes, seconds } = formatCountdown(countdown)
  const prevDisplay = prevIssue ? issueShort(prevIssue) : issuePrev(currentIssue)
  const currDisplay = issueShort(currentIssue)
  const isDrawing = drawing || closed
  const showDrawingLabel = isDrawing && countdown <= 0
  const urgent = !isDrawing && countdown > 0 && countdown <= 60
  const compactDrawResult = gameType === 'lucky28'
  const isInlineDrawHeader = gameType === 'pk10' || gameType === 'k3'

  return (
    <section className="mx-2 mt-2 overflow-visible rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      {/* Previous draw */}
      {compactDrawResult ? (
        <>
          <button
            type="button"
            onClick={onToggleHistory}
            aria-expanded={showHistory}
            aria-label={showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
            className="flex w-full items-center justify-between gap-2 border-b border-gray-100 px-2 py-2 text-left transition hover:bg-[#fafbfc]"
          >
            <IssueInline label="งวด" issue={prevDisplay} />
            <DrawHistoryChevron expanded={showHistory} />
          </button>
          <div className="border-b border-gray-100 px-2 py-2">
            {lastDraw ? (
              <DrawResultView
                gameType={gameType}
                numbers={lastDraw.numbers}
                analyz={lastDraw.analyz}
                small
                highlight
              />
            ) : (
              <p className="py-1 text-center text-sm text-[#969799]">รอผลรางวัล</p>
            )}
          </div>
        </>
      ) : isInlineDrawHeader ? (
        <button
          type="button"
          onClick={onToggleHistory}
          aria-expanded={showHistory}
          aria-label={showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
          className="flex w-full flex-col border-b border-gray-100 text-left transition hover:bg-[#fafbfc]"
        >
          <div className="flex items-center gap-2 px-2 py-2">
            <IssueInline label="งวด" issue={prevDisplay} />
            <div className="min-w-0 flex-1 overflow-x-auto py-0.5">
              {lastDraw ? (
                <DrawResultView
                  gameType={gameType}
                  numbers={lastDraw.numbers}
                  analyz={lastDraw.analyz}
                  small
                  highlight
                />
              ) : (
                <span className="text-sm text-[#969799]">รอผลรางวัล</span>
              )}
            </div>
            <DrawHistoryChevron expanded={showHistory} />
          </div>
          {!showHistory && (
            <div className="flex justify-center border-t border-dashed border-gray-100 py-1">
              <ChevronDown className="h-4 w-4 text-[#4e72f3] opacity-80" strokeWidth={2.5} aria-hidden />
            </div>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggleHistory}
          aria-expanded={showHistory}
          aria-label={showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
          className="flex w-full items-center gap-2 border-b border-gray-100 px-2 py-2 text-left transition hover:bg-[#fafbfc]"
        >
          <IssueInline label="งวด" issue={prevDisplay} />
          <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto px-0.5">
            {lastDraw ? (
              <DrawResultView
                gameType={gameType}
                numbers={lastDraw.numbers}
                analyz={lastDraw.analyz}
                small
                highlight
              />
            ) : (
              <span className="text-sm text-[#969799]">รอผลรางวัล</span>
            )}
          </div>
          <DrawHistoryChevron expanded={showHistory} />
        </button>
      )}

      {/* Current issue + countdown */}
      <div className="flex items-center gap-2 px-2 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <IssueInline label="งวด" issue={currDisplay} />
          <StatusBadges isDrawing={isDrawing} />
        </div>
        <div className="shrink-0">
          <CountdownBlock
            showDrawingLabel={showDrawingLabel}
            urgent={urgent}
            isDrawing={isDrawing}
            minutes={minutes}
            seconds={seconds}
          />
        </div>
      </div>

      {showHistory && (
        <div className="border-t border-gray-100 bg-[#fafbfc]">
          <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
            <History className="h-4 w-4 text-[#969799]" strokeWidth={2.2} aria-hidden />
            <span className="text-sm font-semibold text-[#646566]">ประวัติผล</span>
            <div className="flex flex-1 flex-wrap justify-end gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setHistoryMode(tab.value)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium transition',
                    historyMode === tab.value
                      ? 'bg-[#4e72f3] text-white shadow-sm'
                      : 'bg-white text-[#646566] ring-1 ring-[#ebedf0] hover:bg-[#f0f4ff]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[220px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#969799]">ยังไม่มีผลออก</p>
            ) : (
              history.map((row) =>
                compactDrawResult ? (
                  <div
                    key={row.id}
                    className="border-b border-dashed border-gray-100 px-2 py-1.5 last:border-0"
                  >
                    <p className="text-center text-sm font-semibold tabular-nums text-[#4e72f3]">
                      {issueShort(row.issue)}
                    </p>
                    <div className="mt-1.5 flex justify-center px-1">
                      <DrawResultView
                        gameType={gameType}
                        numbers={row.numbers}
                        analyz={row.analyz}
                        historyMode={historyMode}
                        small
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 border-b border-dashed border-gray-100 px-2 py-1.5 last:border-0"
                  >
                    <IssueInline
                      label="งวด"
                      issue={issueShort(row.issue)}
                      compact
                    />
                    <div className="min-w-0 overflow-hidden">
                      <DrawResultView
                        gameType={gameType}
                        numbers={row.numbers}
                        analyz={row.analyz}
                        historyMode={historyMode}
                        small
                        fitWidth
                      />
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      )}
    </section>
  )
}
