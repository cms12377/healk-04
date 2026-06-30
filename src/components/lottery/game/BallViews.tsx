import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, History } from 'lucide-react'
import type { DrawRecord, LotteryGameType } from '@/types'
import { translateBetLabel, translateZodiacLabel } from '@/lib/gameLabels'
import {
  HISTORY_TABS,
  issuePrev,
  issueShort,
  k3CellClass,
  labelChipClass,
  lucky28Sum,
  markSixBallClass,
  PK10_BALL_CLASS,
  splitMarkSix,
} from '@/lib/drawDisplay'
import { K3DiceFace } from '@/components/lottery/game/K3DiceFace'
import { formatCountdown, GAME_CYCLE_LABEL } from '@/lib/gameIntervals'
import { getGameType } from '@/services/lotteryUtils'
import { cn } from '@/lib/utils'

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
}: {
  n: string
  small?: boolean
  highlight?: boolean
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
}: {
  numbers: string[]
  analyz?: DrawRecord['analyz']
  small?: boolean
  highlight?: boolean
}) {
  const balls = numbers.slice(0, 5)
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'flex flex-nowrap items-center gap-[3px] overflow-x-auto',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {balls.map((n, i) => (
          <SscBall key={`${n}-${i}`} n={n} small={small} highlight={highlight} />
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

export function LabelChip({ label, small }: { label: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded px-1.5 font-bold text-white',
        small ? 'h-7 min-w-7 text-sm' : 'h-8 min-w-8 text-base',
        labelChipClass(label),
      )}
    >
      {label}
    </span>
  )
}

/** th6688 KuaiSan — 6-cell grid: 3 dice + sum + big/small + odd/even */
export function K3KuaiSanGrid({
  numbers,
  analyz,
  compact,
}: {
  numbers: string[]
  analyz?: DrawRecord['analyz']
  /** Smaller dice/text for history rows (th6688 type="sime") */
  compact?: boolean
}) {
  const dice = numbers.slice(0, 3)
  const sum = lucky28Sum(dice)
  const dxRaw = analyz?.dx
  const dsRaw = analyz?.ds
  const dx =
    dxRaw === 'big' ? '大' : dxRaw === 'small' ? '小' : dxRaw ?? (sum >= 11 ? '大' : '小')
  const ds =
    dsRaw === 'odd' ? '单' : dsRaw === 'even' ? '双' : dsRaw ?? (sum % 2 === 1 ? '单' : '双')

  const tailCells = [String(sum), translateBetLabel(dx), translateBetLabel(ds)]
  const dxClass = dx
  const dsClass = ds

  return (
    <div className="w-full max-w-full grid grid-cols-6 gap-[3px]">
      {dice.map((n, i) => (
        <div
          key={`d-${i}-${n}`}
          className="flex items-center justify-center rounded-[3px]"
        >
          <K3DiceFace value={n} size={compact ? 'sm' : 'md'} />
        </div>
      ))}
      {tailCells.map((text, i) => {
        const chipLabel = i === 1 ? dxClass : i === 2 ? dsClass : String(sum)
        const cellIndex = i + 3
        return (
          <div
            key={`t-${i}-${text}`}
            className={cn(
              'flex items-center justify-center rounded-[3px] font-bold',
              compact ? 'h-7 text-sm' : 'h-8 text-base',
              k3CellClass(chipLabel, cellIndex),
              i === 0 && 'border border-[#3a81e5] bg-transparent text-[#3a81e5]',
            )}
          >
            {text}
          </div>
        )
      })}
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
}: {
  numbers: string[]
  zodiac?: string[]
  small?: boolean
  highlightSpecial?: boolean
}) {
  const { regular, special } = splitMarkSix(numbers)
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {regular.map((n, i) => (
        <MarkSixBall key={`r-${i}`} n={n} small={small} />
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
}: {
  gameType: LotteryGameType
  numbers: string[]
  analyz?: DrawRecord['analyz']
  historyMode?: string
  small?: boolean
  /** Emphasize key stats on the main draw panel (sum, special ball, etc.) */
  highlight?: boolean
}) {
  if (gameType === 'pk10') {
    if (historyMode === '2' && analyz?.dxList) {
      return (
        <div className="flex flex-wrap gap-1">
          {analyz.dxList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} />
          ))}
        </div>
      )
    }
    if (historyMode === '3' && analyz?.dsList) {
      return (
        <div className="flex flex-wrap gap-1">
          {analyz.dsList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} />
          ))}
        </div>
      )
    }
    if (historyMode === '4') {
      const sum = Number(numbers[0] || 0) + Number(numbers[1] || 0)
      return <span className="font-bold text-[#3a63aa]">{sum}</span>
    }
    return <Pk10NumRow numbers={numbers} small={small} />
  }

  if (gameType === 'k3') {
    return (
      <K3KuaiSanGrid
        numbers={numbers}
        analyz={analyz}
        compact={small}
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
        <div className="flex flex-wrap gap-1">
          {analyz.dxList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} />
          ))}
        </div>
      )
    }
    if (historyMode === '3' && analyz?.dsList) {
      return (
        <div className="flex flex-wrap gap-1">
          {analyz.dsList.map((l, i) => (
            <LabelChip key={i} label={l} small={small} />
          ))}
        </div>
      )
    }
    if (historyMode === '4' && analyz?.result) {
      return (
        <div className="flex flex-wrap gap-1">
          {analyz.result.map((l, i) => (
            <LabelChip key={i} label={l} small={small} />
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
  onFullHistory: () => void
}

export function Pk10NumRow({ numbers, small }: { numbers: string[]; small?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-nowrap items-center gap-[3px] overflow-x-auto',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        small && 'scale-90',
      )}
    >
      {numbers.map((n, i) => (
        <Pk10Ball key={`${n}-${i}`} n={n} small={small} className="shrink-0" />
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
  onFullHistory,
}: GameDrawPanelProps) {
  const gameType = getGameType(code)
  const tabs = HISTORY_TABS[gameType]
  const [historyMode, setHistoryMode] = useState('1')
  const cycleLabel = GAME_CYCLE_LABEL[code]

  const { minutes, seconds } = formatCountdown(countdown)
  const prevDisplay = prevIssue ? issueShort(prevIssue) : issuePrev(currentIssue)
  const currDisplay = issueShort(currentIssue)
  const isDrawing = drawing || closed
  const showDrawingLabel = isDrawing && countdown <= 0
  const urgent = !isDrawing && countdown > 0 && countdown <= 60
  const compactDrawResult = gameType === 'lucky28'

  return (
    <section className="mx-2 mt-2 overflow-visible rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      {/* Previous draw */}
      {compactDrawResult ? (
        <>
          <div className="flex items-center justify-between gap-1 border-b border-gray-100 px-2 py-2">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#969799]">งวดก่อน</p>
              <p className="text-base font-bold tabular-nums text-[#4e72f3]">
                {prevDisplay || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleHistory}
              aria-expanded={showHistory}
              aria-label={showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f7fa] text-[#646566] ring-1 ring-[#ebedf0] transition hover:bg-[#eef2ff] hover:text-[#4e72f3]"
            >
              {showHistory ? (
                <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
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
      ) : (
        <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-2">
          <div className="w-[72px] shrink-0 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#969799]">งวดก่อน</p>
            <p className="text-base font-bold tabular-nums text-[#4e72f3]">
              {prevDisplay || '—'}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-0.5">
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

          <button
            type="button"
            onClick={onToggleHistory}
            aria-expanded={showHistory}
            aria-label={showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f7fa] text-[#646566] ring-1 ring-[#ebedf0] transition hover:bg-[#eef2ff] hover:text-[#4e72f3]"
          >
            {showHistory ? (
              <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      )}

      {/* Current issue + countdown */}
      <div className="flex items-center gap-1 px-2 py-2">
        <div className="w-[72px] shrink-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#969799]">งวดปัจจุบัน</p>
          <p className="text-base font-bold tabular-nums text-[#4e72f3]">
            {currDisplay || '—'}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
            {cycleLabel && (
              <span className="inline-block rounded-full bg-[#eef2ff] px-1.5 py-px text-xs font-semibold text-[#4e72f3] ring-1 ring-[#4e72f3]/15">
                {cycleLabel}/งวด
              </span>
            )}
            <span
              className={cn(
                'inline-block rounded-full px-1.5 py-px text-xs font-semibold',
                isDrawing
                  ? 'bg-[#e8f5e9] text-[#2e7d32]'
                  : 'bg-[#ffebee] text-[#c62828]',
              )}
            >
              {isDrawing ? 'ออกผล' : 'รับแทง'}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          {showDrawingLabel ? (
            <p className="text-2xl font-bold text-[#00bf71]">กำลังออกผล...</p>
          ) : (
            <div
              className={cn(
                'flex items-center justify-center gap-0.5 font-bold tabular-nums',
                urgent ? 'text-[#e53935]' : isDrawing ? 'text-[#00bf71]' : 'text-[#2c3345]',
              )}
            >
              <Clock className="mr-0.5 h-5 w-5 opacity-60" strokeWidth={2.2} aria-hidden />
              <span className="min-w-[2ch] text-3xl">{minutes}</span>
              <span className="text-3xl opacity-70">:</span>
              <span className="min-w-[2ch] text-3xl">{seconds}</span>
            </div>
          )}
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
                    className="flex items-center border-b border-dashed border-gray-100 px-2 py-1.5 last:border-0"
                  >
                    <span className="w-[72px] shrink-0 text-center text-sm font-semibold tabular-nums text-[#4e72f3]">
                      {issueShort(row.issue)}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-center px-1">
                      <DrawResultView
                        gameType={gameType}
                        numbers={row.numbers}
                        analyz={row.analyz}
                        historyMode={historyMode}
                        small
                      />
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          <div className="flex justify-center border-t border-gray-100 py-2">
            <button
              type="button"
              onClick={onFullHistory}
              className="rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition active:scale-95"
            >
              ดูประวัติทั้งหมด
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
