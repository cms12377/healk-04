import { useState } from 'react'
import type { DrawRecord, LotteryGameType } from '@/types'
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
import { getGameType } from '@/services/lotteryUtils'
import { cn } from '@/lib/utils'

export function Pk10Ball({ n, small }: { n: string; small?: boolean }) {
  const num = Number(n)
  const cls = PK10_BALL_CLASS[num] ?? 'bg-[#3a81e5] text-white'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold',
        small ? 'h-6 w-6 text-xs' : 'h-7 w-7 text-sm',
        cls,
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
        <span className="ml-1 text-xs text-[#888]">{zodiac.join(' ')}</span>
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
        <Pk10Ball key={i} n={n} small={small} />
      ))}
      <span className="text-xs text-[#666]">=</span>
      <span className={cn('font-bold text-[#3a63aa]', small ? 'text-sm' : 'text-base')}>{sum}</span>
      {labels?.map((l, i) => (
        <LabelChip key={i} label={l} small={small} />
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
    return (
      <div className="flex flex-wrap gap-1">
        {numbers.map((n, i) => (
          <Pk10Ball key={i} n={n} small={small} />
        ))}
      </div>
    )
  }

  if (gameType === 'k3') {
    const extra = analyz?.result ?? [analyz?.dx, analyz?.ds].filter(Boolean) as string[]
    return <K3Row numbers={numbers.slice(0, 3)} labels={extra.length ? [...numbers.slice(0, 3), ...extra] : undefined} small={small} />
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
          <Pk10Ball key={i} n={n} small={small} />
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
    <div className={cn('flex flex-wrap items-center gap-[5px]', small && 'scale-90')}>
      {numbers.map((n, i) => (
        <Pk10Ball key={`${n}-${i}`} n={n} small={small} />
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

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0')
  const secs = String(countdown % 60).padStart(2, '0')
  const prevDisplay = prevIssue ? issueShort(prevIssue) : issuePrev(currentIssue)
  const currDisplay = issueShort(currentIssue)
  const isDrawing = drawing || closed

  return (
    <>
      <div className="flex w-full items-center bg-white pt-2.5">
        <div className="flex flex-1 flex-col items-center p-5 px-2.5">
          <div className="whitespace-nowrap text-sm text-[#666]">
            <span className="text-[#3a63aa]">{prevDisplay || '0000'}</span> งวด
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center gap-[5px] pr-[5px]">
          {lastDraw ? (
            <DrawResultView
              gameType={gameType}
              numbers={lastDraw.numbers}
              analyz={lastDraw.analyz}
              small
            />
          ) : (
            <span className="text-xs text-[#888]">—</span>
          )}
          <button type="button" onClick={onToggleHistory} className="shrink-0 text-[#666]">
            {showHistory ? '▲' : '▼'}
          </button>
        </div>
      </div>

      <div className="flex w-full items-center bg-white">
        <div className="flex flex-1 flex-col items-center p-5 py-2.5 px-2.5">
          <div className="whitespace-nowrap text-sm text-[#666]">
            <span className="text-[#3a63aa]">{currDisplay || '000'}</span> งวด
          </div>
          <div className={cn('text-[13px]', isDrawing ? 'text-[#00bf71]' : 'text-[#d7524e]')}>
            {isDrawing ? 'กำลังออกผล' : 'กำลังรับแทง'}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-between px-2.5 py-2.5">
          {isDrawing && countdown <= 0 ? (
            <div className="w-full text-center text-[25px] font-bold text-[#00bf71]">ออกผล</div>
          ) : (
            <div
              className={cn(
                'flex w-full items-center justify-center text-2xl font-bold',
                isDrawing ? 'text-[#00bf71]' : 'text-[#d7524e]',
              )}
            >
              <span className="inline-block w-[22px] text-center">{mins}</span>
              <span className="mx-1">:</span>
              <span className="inline-block w-[22px] text-center">{secs}</span>
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="relative z-[9] bg-white">
          <div className="absolute left-0 top-0 z-10 flex w-full items-center gap-1 bg-[#f1f1f1] p-1.5 text-xs">
            <span className="shrink-0 text-[12px] text-[#666]">ประวัติ</span>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setHistoryMode(tab.value)}
                  className={cn(
                    'flex items-center justify-center rounded-[30px] border border-[#ccc] px-1 py-0.5',
                    historyMode === tab.value ? 'bg-[#6298d6] text-white' : 'bg-white text-[#333]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[200px] overflow-auto bg-white pt-[37px]">
            {history.length === 0 ? (
              <p className="p-3 text-center text-xs text-[#888]">ยังไม่มีผลออก</p>
            ) : (
              history.map((row) => (
                <div
                  key={row.id}
                  className="borb1 flex w-full items-center border-b border-dashed border-[#eee] p-1.5 text-[12px]"
                >
                  <span className="shrink-0 basis-[26%] border-r border-[#ccc] text-center text-[12px] text-[#3a81e5]">
                    {issueShort(row.issue)}期
                  </span>
                  <div className="flex flex-1 items-center justify-around">
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
            <div className="flex items-center justify-center py-2.5 text-[12px]">
              <button
                type="button"
                onClick={onFullHistory}
                className="flex items-center justify-center rounded-[30px] bg-[#6298d6] px-2.5 py-[3px] text-white"
              >
                ดูทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
