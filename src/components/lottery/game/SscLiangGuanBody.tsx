import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { SscBall } from '@/components/lottery/game/BallViews'
import {
  BET_BODY_PAD,
  BET_CELL_COLUMN,
  BET_CELL_K3_RING,
  BET_GRID_K3,
  BET_SECTION_HEADER,
  BET_SECTION_K3,
  BET_SELECTED,
  sideChipClass,
} from '@/components/lottery/game/betStyles'
import { translateBetLabel, translateCategoryName, translateGroupName } from '@/lib/gameLabels'
import { cn } from '@/lib/utils'

type TabMode = 'balls' | 'twoSide'

const SUM_SIDE_ORDER = [
  'sum_big',
  'sum_small',
  'sum_odd',
  'sum_even',
  'sum_dragon',
  'sum_tiger',
  'sum_he',
]

const BALL_SIDE_ORDER = ['big', 'small', 'odd', 'even']

function resolveTabMode(group: BetGroup): TabMode {
  if (group.id.includes('balls')) return 'balls'
  return 'twoSide'
}

function isBallSideOption(opt: BetOption): boolean {
  const bc = opt.betContent ?? ''
  return /^(ball1|b[2-5])_(big|small|odd|even)$/.test(bc)
}

function isBallDigitOption(opt: BetOption): boolean {
  const bc = opt.betContent ?? ''
  if (/^(ball1|b[2-5])_\d$/.test(bc)) return true
  return /^\d$/.test(opt.label)
}

function ballDigit(opt: BetOption): string | null {
  const m = /^(ball1|b[2-5])_(\d)$/.exec(opt.betContent ?? '')
  if (m) return m[2]
  if (/^\d$/.test(opt.label)) return opt.label
  return null
}

function sortSumOptions(options: BetOption[]): BetOption[] {
  return [...options].sort(
    (a, b) =>
      SUM_SIDE_ORDER.indexOf(a.betContent ?? '') -
      SUM_SIDE_ORDER.indexOf(b.betContent ?? ''),
  )
}

function sortBallSideOptions(options: BetOption[]): BetOption[] {
  return [...options].sort((a, b) => {
    const aKey = (a.betContent ?? '').replace(/^(ball1|b[2-5])_/, '')
    const bKey = (b.betContent ?? '').replace(/^(ball1|b[2-5])_/, '')
    return BALL_SIDE_ORDER.indexOf(aKey) - BALL_SIDE_ORDER.indexOf(bKey)
  })
}

function sortBallDigitOptions(options: BetOption[]): BetOption[] {
  return [...options].sort(
    (a, b) => Number(ballDigit(a) ?? 0) - Number(ballDigit(b) ?? 0),
  )
}

function sortSectionOptions(options: BetOption[], tabMode: TabMode, categoryId: string): BetOption[] {
  if (tabMode === 'balls') {
    const sides = options.filter(isBallSideOption)
    const digits = options.filter(isBallDigitOption)
    return [...sortBallSideOptions(sides), ...sortBallDigitOptions(digits)]
  }
  if (categoryId === 'sum' || options.some((o) => (o.betContent ?? '').startsWith('sum_'))) {
    return sortSumOptions(options)
  }
  if (options.some(isBallSideOption)) return sortBallSideOptions(options)
  return options
}

const SSC_HCELL = cn(
  BET_CELL_K3_RING,
  'bet-item grid min-h-[48px] w-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-1 overflow-hidden px-1.5 py-1 transition-all active:scale-[0.98]',
)

const SSC_SIDE_CHIP =
  'mx-auto flex h-8 w-full min-w-0 max-w-[4.25rem] items-center justify-center rounded-md px-0.5 text-xs font-bold leading-tight text-white shadow-sm'

const SSC_ODDS =
  'shrink-0 text-right text-sm font-semibold tabular-nums leading-none text-[#e53935]'

/** SSC — สองด้าน | ลูก 1–5 */
export function SscLiangGuanBody({
  group,
  selected,
  onToggle,
}: {
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
}) {
  const tabMode = resolveTabMode(group)
  const displayGroupName = translateGroupName(group.id, group.name)

  const sections =
    group.categories && group.categories.length > 0
      ? group.categories
      : [{ id: group.id, name: displayGroupName, options: group.options }]

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      {sections.map((cat) => {
        const categoryName = translateCategoryName(cat.name)
        const options = sortSectionOptions(cat.options, tabMode, cat.id)
        const gridClass = cn(
          BET_GRID_K3,
          tabMode === 'balls' && options.some(isBallDigitOption) && !options.some(isBallSideOption)
            ? 'grid-cols-5'
            : 'grid-cols-2',
        )

        return (
          <div key={cat.id} className={BET_SECTION_K3}>
            <div className={BET_SECTION_HEADER}>{categoryName}</div>
            <div className={gridClass}>
              {options.map((opt) => {
                const isSelected = selected.some((s) => s.option.id === opt.id)
                const displayLabel = translateBetLabel(opt.label, opt.betContent)

                if (tabMode === 'balls' && isBallDigitOption(opt)) {
                  const digit = ballDigit(opt)
                  if (digit != null) {
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onToggle(opt, displayGroupName, categoryName)}
                        className={cn(
                          BET_CELL_COLUMN,
                          BET_CELL_K3_RING,
                          'bet-item min-h-[52px] w-full transition-all active:scale-[0.98]',
                          isSelected && BET_SELECTED,
                        )}
                      >
                        <SscBall
                          n={digit}
                          small
                          className="h-8 w-8 rounded-full text-sm"
                        />
                        <span className={SSC_ODDS}>{opt.odds}</span>
                      </button>
                    )
                  }
                }

                const chipKey = opt.betContent ?? opt.label
                const chipColor = sideChipClass(chipKey)

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt, displayGroupName, categoryName)}
                    className={cn(SSC_HCELL, isSelected && BET_SELECTED)}
                  >
                    <span className={cn(SSC_SIDE_CHIP, chipColor)}>{displayLabel}</span>
                    <span className={SSC_ODDS}>{opt.odds}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
