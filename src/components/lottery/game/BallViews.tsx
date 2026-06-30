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
import { formatCountdown } from '@/lib/gameIntervals'
import { getGameType } from '@/services/lotteryUtils'
import { cn } from '@/lib/utils'

export function Pk10Ball({ n, small, className }: { n: string; small?: boolean; className?: string }) {
  const num = Number(n)
  const cls = PK10_BALL_CLASS[num] ?? 'bg-[#3a81e5] text-white'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold',
        small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm',
        cls,
        className,
      )}
    >
      {n}
    </span>
  )
}

export function MarkSixBall({ n, small }: { n: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold',
        small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm',
        markSixBallClass(n),
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
        'inline-flex items-center justify-center rounded-[4px] border border-[#3a81e5] bg-white font-bold text-[#3a81e5]',
        small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm',
      )}
    >
      {n}
    </span>
  )
}

export function SscBall({ n, small }: { n: string; small?: boolean }) {
  return <Lucky28Ball n={n} small={small} />
}

export function LabelChip({ label, small }: { label: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded px-1.5 font-bold text-white',
        small ? 'h-6 min-w-6 text-xs' : 'h-7 min-w-7 text-sm',
        labelChipClass(label),
      )}
    >
      {label}
    </span>
  )
}

function K3Dice({ value, small }: { value: string; small?: boolean }) {
  const n = Number(value)
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-[3px] border border-[#3a81e5] bg-[#eef4ff] font-bold text-[#3a81e5]',
        small ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-base',
      )}
    >
      {Number.isNaN(n) ? value : n}
    </span>
  )
}

export function K3Row({ numbers, labels, small }: { numbers: string[]; labels?: string[]; small?: boolean }) {
  const cells = labels ?? numbers
  return (
    <div className={cn('grid grid-cols-6 gap-[3px]', small ? 'text-[14px]' : 'text-[16px]')}>
      {cells.map((cell, i) => {
        const isDice = i <= 2 && numbers[i]
        const text = labels ? cell : i > 2 ? cell : ''
        return (
          <div
            key={`${cell}-${i}`}
            className={cn(
              'flex items-center justify-center rounded-[3px] font-bold text-white',
              isDice ? '' : k3CellClass(text || numbers[i] || '', i),
              small ? 'h-6 text-xs' : 'h-8 text-sm',
              !isDice && !['大', '小', '单', '双', '龙', '虎', '和'].includes(text) && i > 2
                ? 'border border-[#3a81e5] !bg-transparent !text-[#3a81e5]'
                : '',
            )}
          >
            {isDice ? <K3Dice value={numbers[i]} small={small} /> : text}
          </div>
        )
      })}
    </div>
  )
}

export function MarkSixResultRow({
  numbers,
  zodiac,
  small,
}: {
  numbers: string[]
  zodiac?: string[]
  small?: boolean
}) {
  const { regular, special } = splitMarkSix(numbers)
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {regular.map((n, i) => (
        <MarkSixBall key={`r-${i}`} n={n} small={small} />
      ))}
      {special.length > 0 && (
        <>
          <span className="text-[#d7524e]">+</span>
          <MarkSixBall n={special[0]} small={small} />
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
}: {
  numbers: string[]
  labels?: string[]
  small?: boolean
}) {
  const sum = lucky28Sum(numbers)
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {numbers.map((n, i) => (
        <Lucky28Ball key={i} n={n} small={small} />
      ))}
      <span className="text-xs text-[#666]">=</span>
      <span className={cn('font-bold text-[#3a63aa]', small ? 'text-sm' : 'text-base')}>{sum}</span>
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
}: {
  gameType: LotteryGameType
  numbers: string[]
  analyz?: DrawRecord['analyz']
  historyMode?: string
  small?: boolean
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
    const dice = numbers.slice(0, 3)
    const sum = lucky28Sum(dice)
    const dxRaw = analyz?.dx
    const dsRaw = analyz?.ds
    const dx =
      dxRaw === 'big' ? '大' : dxRaw === 'small' ? '小' : dxRaw ?? (sum >= 11 ? '大' : '小')
    const ds =
      dsRaw === 'odd' ? '单' : dsRaw === 'even' ? '双' : dsRaw ?? (sum % 2 === 1 ? '单' : '双')
    const parsed = analyz?.result
    const tail =
      parsed && parsed.length >= 3
        ? parsed.slice(-3)
        : [String(sum), dx, ds]
    return (
      <K3Row
        numbers={dice}
        labels={[dice[0] ?? '', dice[1] ?? '', dice[2] ?? '', tail[0], tail[1], tail[2]]}
        small={small}
      />
    )
  }

  if (gameType === 'marksix') {
    return <MarkSixResultRow numbers={numbers} zodiac={analyz?.zodiac} small={small} />
  }

  if (gameType === 'lucky28') {
    const labels = [analyz?.dx, analyz?.ds, analyz?.wave].filter(Boolean) as string[]
    return <Lucky28Row numbers={numbers.slice(0, 3)} labels={labels} small={small} />
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
      <div className="flex flex-wrap gap-1">
        {numbers.map((n, i) => (
          <SscBall key={i} n={n} small={small} />
        ))}
      </div>
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

  const { minutes, seconds } = formatCountdown(countdown)
  const prevDisplay = prevIssue ? issueShort(prevIssue) : issuePrev(currentIssue)
  const currDisplay = issueShort(currentIssue)
  const isDrawing = drawing || closed
  const showDrawingLabel = isDrawing && countdown <= 0
  const urgent = !isDrawing && countdown > 0 && countdown <= 60

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      {/* Previous draw */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3">
        <div className="w-[68px] shrink-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#969799]">งวดก่อน</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[#4e72f3]">
            {prevDisplay || '—'}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          {lastDraw ? (
            <DrawResultView
              gameType={gameType}
              numbers={lastDraw.numbers}
              analyz={lastDraw.analyz}
              small
            />
          ) : (
            <span className="text-xs text-[#969799]">รอผลรางวัล</span>
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

      {/* Current issue + countdown */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="w-[68px] shrink-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#969799]">งวดปัจจุบัน</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[#4e72f3]">
            {currDisplay || '—'}
          </p>
          <span
            className={cn(
              'mt-1 inline-block rounded-full px-2 py-px text-[10px] font-semibold',
              isDrawing
                ? 'bg-[#e8f5e9] text-[#2e7d32]'
                : 'bg-[#ffebee] text-[#c62828]',
            )}
          >
            {isDrawing ? 'ออกผล' : 'รับแทง'}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          {showDrawingLabel ? (
            <p className="text-xl font-bold text-[#00bf71]">กำลังออกผล...</p>
          ) : (
            <div
              className={cn(
                'flex items-center justify-center gap-1 font-bold tabular-nums',
                urgent ? 'text-[#e53935]' : isDrawing ? 'text-[#00bf71]' : 'text-[#2c3345]',
              )}
            >
              <Clock className="mr-1 h-4 w-4 opacity-60" strokeWidth={2.2} aria-hidden />
              <span className="min-w-[2ch] text-2xl">{minutes}</span>
              <span className="text-2xl opacity-70">:</span>
              <span className="min-w-[2ch] text-2xl">{seconds}</span>
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="border-t border-gray-100 bg-[#fafbfc]">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <History className="h-3.5 w-3.5 text-[#969799]" strokeWidth={2.2} aria-hidden />
            <span className="text-xs font-semibold text-[#646566]">ประวัติผล</span>
            <div className="flex flex-1 flex-wrap justify-end gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setHistoryMode(tab.value)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition',
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
              <p className="py-6 text-center text-xs text-[#969799]">ยังไม่มีผลออก</p>
            ) : (
              history.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center border-b border-dashed border-gray-100 px-3 py-2 last:border-0"
                >
                  <span className="w-[72px] shrink-0 text-center text-xs font-semibold tabular-nums text-[#4e72f3]">
                    {issueShort(row.issue)}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto">
                    <DrawResultView
                      gameType={gameType}
                      numbers={row.numbers}
                      analyz={row.analyz}
                      historyMode={historyMode}
                      small
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-center border-t border-gray-100 py-2.5">
            <button
              type="button"
              onClick={onFullHistory}
              className="rounded-full bg-gradient-to-r from-[#3880e5] to-[#4e72f3] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              ดูประวัติทั้งหมด
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
