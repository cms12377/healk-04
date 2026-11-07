import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { Lucky28Ball } from '@/components/lottery/game/BallViews'
import {
  BET_BODY_PAD,
  BET_CELL_K3_RING,
  BET_CELL_PK10_SUM_LEFT,
  BET_CELL_PK10_SUM_RIGHT,
  BET_GRID_K3,
  BET_GRID_PK10_SUM,
  BET_NUM_BOX,
  BET_ODDS_ALIGN,
  BET_SECTION_HEADER,
  BET_SECTION_K3,
  BET_SELECTED,
  sideChipClass,
} from '@/components/lottery/game/betStyles'
import { translateBetLabel, translateCategoryName, translateGroupName } from '@/lib/gameLabels'
import {
  isLucky28IntegrateGroup,
  isLucky28SumGroup,
} from '@/lib/gameNav'
import { cn } from '@/lib/utils'

type TabMode = 'integrate' | 'balls' | 'sum'

const INTEGRATE_SIDE_ORDER = [
  'big',
  'small',
  'odd',
  'even',
  'bigOdd',
  'bigEven',
  'smallEdd',
  'smallEven',
  'bigBig',
  'smallSmall',
  'baozi',
  'shunzi',
  'duizi',
  'dragon',
  'tiger',
  'he',
  'red',
  'green',
  'blue',
]

function resolveTabMode(group: BetGroup): TabMode {
  if (
    group.id.includes('balls') ||
    group.categories?.some((c) => /球|ball/i.test(c.name))
  ) {
    return 'balls'
  }
  if (isLucky28SumGroup(group)) return 'sum'
  if (isLucky28IntegrateGroup(group)) return 'integrate'
  if (group.id === 'hz28' || group.id.includes('sum')) return 'sum'
  return 'integrate'
}

function isBallSideOption(opt: BetOption): boolean {
  const bc = opt.betContent ?? ''
  if (/^(ball1|b[23])_(big|small|odd|even)$/.test(bc)) return true
  return ['big', 'small', 'odd', 'even'].includes(bc)
}

function isBallDigitOption(opt: BetOption): boolean {
  const bc = opt.betContent ?? ''
  if (/^(ball1|b[23])_\d$/.test(bc)) return true
  return /^\d$/.test(opt.label)
}

function isSumDigitOption(opt: BetOption): boolean {
  const raw = opt.betContent ?? opt.label
  if (/^sum_\d+$/.test(raw)) return true
  const num = Number(raw)
  return /^\d{1,2}$/.test(raw) && num >= 0 && num <= 27
}

function sumDigit(opt: BetOption): string {
  const bc = opt.betContent ?? ''
  const fromSum = /^sum_(\d+)$/.exec(bc)?.[1]
  if (fromSum) return fromSum
  return opt.label
}

function ballDigit(opt: BetOption): string | null {
  const m = /^(ball1|b[23])_(\d)$/.exec(opt.betContent ?? '')
  if (m) return m[2]
  if (/^\d$/.test(opt.label)) return opt.label
  return null
}

function sortIntegrateOptions(options: BetOption[]): BetOption[] {
  return [...options].sort(
    (a, b) =>
      INTEGRATE_SIDE_ORDER.indexOf(a.betContent ?? '') -
      INTEGRATE_SIDE_ORDER.indexOf(b.betContent ?? ''),
  )
}

function sortSumOptions(options: BetOption[]): BetOption[] {
  return [...options].sort(
    (a, b) => Number(sumDigit(a)) - Number(sumDigit(b)),
  )
}

function sortBallOptions(options: BetOption[]): BetOption[] {
  return [...options].sort((a, b) => {
    const aSide = isBallSideOption(a)
    const bSide = isBallSideOption(b)
    if (aSide !== bSide) return aSide ? -1 : 1
    if (aSide) {
      const order = ['big', 'small', 'odd', 'even']
      return order.indexOf(a.betContent ?? '') - order.indexOf(b.betContent ?? '')
    }
    return Number(ballDigit(a) ?? 0) - Number(ballDigit(b) ?? 0)
  })
}

const LUCKY28_HCELL = cn(
  BET_CELL_K3_RING,
  'bet-item grid min-h-[48px] w-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-1 overflow-hidden px-1.5 py-1 transition-all active:scale-[0.98]',
)

const LUCKY28_SIDE_CHIP =
  'mx-auto flex h-8 w-full min-w-0 max-w-[4.25rem] items-center justify-center rounded-md px-0.5 text-xs font-bold leading-tight text-white shadow-sm'

const LUCKY28_ODDS =
  'shrink-0 text-right text-sm font-semibold tabular-nums leading-none text-[#e53935]'

const LUCKY28_SUM_NUM = cn(BET_NUM_BOX, 'rounded-full')

/** Lucky28 — ผลรวม | สองด้าน | ลูกที่ 1–3 */
export function Lucky28LiangGuanBody({
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
        const options =
          tabMode === 'integrate'
            ? sortIntegrateOptions(cat.options)
            : tabMode === 'sum'
              ? sortSumOptions(cat.options)
              : sortBallOptions(cat.options)

        const gridClass =
          tabMode === 'sum'
            ? cn(BET_GRID_PK10_SUM, 'grid-cols-2')
            : cn(BET_GRID_K3, 'grid-cols-2')

        return (
          <div key={cat.id} className={BET_SECTION_K3}>
            {sections.length > 1 || tabMode !== 'integrate' ? (
              <div className={BET_SECTION_HEADER}>{categoryName}</div>
            ) : (
              <div className="w-full py-1.5 text-center text-base font-semibold text-[#2c3345]">
                {categoryName}
              </div>
            )}
            <div className={gridClass}>
              {options.map((opt, index) => {
                const isSelected = selected.some((s) => s.option.id === opt.id)
                const displayLabel = translateBetLabel(opt.label, opt.betContent)

                if (tabMode === 'sum' && isSumDigitOption(opt)) {
                  const isLeftCol = index % 2 === 0
                  const Cell = isLeftCol ? BET_CELL_PK10_SUM_LEFT : BET_CELL_PK10_SUM_RIGHT
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onToggle(opt, displayGroupName, categoryName)}
                      className={cn(Cell, 'w-full', isSelected && BET_SELECTED)}
                    >
                      {isLeftCol ? (
                        <>
                          <span aria-hidden className="min-w-0" />
                          <span className={LUCKY28_SUM_NUM}>{sumDigit(opt)}</span>
                          <span className={BET_ODDS_ALIGN}>{opt.odds}</span>
                        </>
                      ) : (
                        <>
                          <span className={LUCKY28_SUM_NUM}>{sumDigit(opt)}</span>
                          <span className={BET_ODDS_ALIGN}>{opt.odds}</span>
                          <span aria-hidden className="min-w-0" />
                        </>
                      )}
                    </button>
                  )
                }

                if (tabMode === 'balls' && isBallDigitOption(opt)) {
                  const digit = ballDigit(opt)
                  if (digit != null) {
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onToggle(opt, displayGroupName, categoryName)}
                        className={cn(LUCKY28_HCELL, isSelected && BET_SELECTED)}
                      >
                        <Lucky28Ball n={digit} small className="mx-auto h-8 w-8 rounded-full text-sm" />
                        <span className={LUCKY28_ODDS}>{opt.odds}</span>
                      </button>
                    )
                  }
                }

                const chipLabel = displayLabel
                const chipColor = sideChipClass(opt.betContent ?? opt.label)

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt, displayGroupName, categoryName)}
                    className={cn(LUCKY28_HCELL, isSelected && BET_SELECTED)}
                  >
                    <span className={cn(LUCKY28_SIDE_CHIP, chipColor)}>{chipLabel}</span>
                    <span className={LUCKY28_ODDS}>{opt.odds}</span>
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
