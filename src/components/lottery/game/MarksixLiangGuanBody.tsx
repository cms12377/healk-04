import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { MarkSixBall } from '@/components/lottery/game/BallViews'
import {
  BET_BODY_PAD,
  BET_CELL_ROW,
  BET_CELL_K3_RING,
  BET_GRID_K3,
  BET_ODDS,
  BET_SELECTED,
  sideChipClass,
} from '@/components/lottery/game/betStyles'
import {
  translateBetLabel,
  translateCategoryName,
  translateGroupName,
  translateZodiacLabel,
} from '@/lib/gameLabels'
import { marksixZodiacNumbers } from '@/lib/marksixZodiac'
import { cn } from '@/lib/utils'

type BetCategory = NonNullable<BetGroup['categories']>[number]

type CategoryMode = 'number' | 'tmTwoSide' | 'zmTwoSide' | 'zodiac'

const TM_NUMBER_CAT = new Set(['特码', '正码'])
const TWO_SIDE_CAT = new Set(['两面'])
const WAVE_CAT = new Set(['波色'])

function markSixNumFromOption(opt: BetOption): string | null {
  const fromContent = /^t[mn]_(\d+)$/.exec(opt.betContent ?? '')?.[1]
  if (fromContent) return fromContent
  if (/^\d+$/.test(opt.label) && Number(opt.label) <= 49) return opt.label
  return null
}

function isWaveOption(opt: BetOption): boolean {
  return ['red', 'green', 'blue'].includes(opt.betContent ?? '')
}

function isSideOption(opt: BetOption): boolean {
  return ['big', 'small', 'odd', 'even'].includes(opt.betContent ?? '')
}

function resolveCategoryMode(groupCode: string, categoryName: string, options: BetOption[]): CategoryMode {
  if (groupCode === 'tx' || groupCode === 'zx') return 'zodiac'
  if (TWO_SIDE_CAT.has(categoryName) || categoryName === translateCategoryName('两面')) {
    return groupCode === 'zm' ? 'zmTwoSide' : 'tmTwoSide'
  }
  if (WAVE_CAT.has(categoryName)) return 'tmTwoSide'
  if (options.some((o) => markSixNumFromOption(o))) return 'number'
  if (options.some(isWaveOption)) return 'tmTwoSide'
  if (options.some(isSideOption)) return groupCode === 'zm' ? 'zmTwoSide' : 'tmTwoSide'
  return 'number'
}

function sortNumberOptions(options: BetOption[]): BetOption[] {
  return [...options].sort((a, b) => {
    const na = Number(markSixNumFromOption(a) ?? 0)
    const nb = Number(markSixNumFromOption(b) ?? 0)
    return na - nb
  })
}

function sortTwoSideOptions(options: BetOption[]): BetOption[] {
  const order = ['big', 'small', 'odd', 'even', 'red', 'blue', 'green']
  return [...options].sort(
    (a, b) =>
      order.indexOf(a.betContent ?? '') - order.indexOf(b.betContent ?? ''),
  )
}

/** th6688 merges tm 两面 + 波色 into one section */
function buildSections(group: BetGroup): BetCategory[] {
  const raw =
    group.categories && group.categories.length > 0
      ? group.categories
      : [{ id: group.id, name: group.name, options: group.options }]

  if (group.id !== 'tm') return raw

  const numbers = raw.filter((c) => TM_NUMBER_CAT.has(c.name))
  const twoSide = raw.filter((c) => TWO_SIDE_CAT.has(c.name))
  const wave = raw.filter((c) => WAVE_CAT.has(c.name))
  const merged: BetCategory[] = []

  if (numbers[0]) merged.push(numbers[0])
  const sideOpts = [
    ...(twoSide[0]?.options ?? []),
    ...(wave[0]?.options ?? []),
  ]
  if (sideOpts.length) {
    merged.push({
      id: 'tm-twoside-merged',
      name: '两面',
      options: sortTwoSideOptions(sideOpts),
    })
  }
  return merged.length ? merged : raw
}

function displaySideLabel(groupCode: string, opt: BetOption): string {
  if (groupCode === 'zm' && isSideOption(opt)) {
    const zmLabels: Record<string, string> = {
      big: '总大',
      small: '总小',
      odd: '总单',
      even: '总双',
    }
    return translateBetLabel(zmLabels[opt.betContent ?? ''] ?? opt.label, opt.betContent)
  }
  return translateBetLabel(opt.label, opt.betContent)
}

function sectionHeader(categoryName: string): string {
  if (TWO_SIDE_CAT.has(categoryName)) return translateCategoryName('两面')
  return translateCategoryName(categoryName)
}

/** Narrow 2-col cells — chip/ball + odds stay inside ring border */
const MARKSIX_HCELL = cn(
  BET_CELL_K3_RING,
  'bet-item grid min-h-[48px] w-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-1 overflow-hidden px-1.5 py-1 transition-all active:scale-[0.98]',
)

const MARKSIX_SIDE_CHIP =
  'mx-auto flex h-8 w-full min-w-0 max-w-[4.25rem] items-center justify-center rounded-md px-0.5 text-xs font-bold leading-tight text-white shadow-sm'

const MARKSIX_ODDS =
  'shrink-0 text-right text-sm font-semibold tabular-nums leading-none text-[#e53935]'

/** th6688 TeMa — 2-col grid, ball/chip left + red odds right; YiXiao — 1-col zodiac rows */
export function MarksixLiangGuanBody({
  group,
  selected,
  onToggle,
}: {
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
}) {
  const displayGroupName = translateGroupName(group.id, group.name)
  const isZodiacTab = group.id === 'tx' || group.id === 'zx'
  const sections = buildSections(group)

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      {sections.map((cat) => {
        const categoryName = sectionHeader(cat.name)
        const mode = resolveCategoryMode(group.id, cat.name, cat.options)
        const options =
          mode === 'number'
            ? sortNumberOptions(cat.options)
            : mode === 'tmTwoSide'
              ? sortTwoSideOptions(cat.options)
              : cat.options

        return (
          <div key={cat.id} className="mb-1 w-full">
            <div className="w-full py-1.5 text-center text-base font-semibold text-[#2c3345]">
              {categoryName}
            </div>
            <div
              className={cn(
                BET_GRID_K3,
                isZodiacTab || mode === 'zodiac' ? 'grid-cols-1' : 'grid-cols-2',
              )}
            >
              {options.map((opt) => {
                const isSelected = selected.some((s) => s.option.id === opt.id)
                const num = markSixNumFromOption(opt)
                const zodiacCode = opt.betContent ?? opt.label

                if (mode === 'zodiac') {
                  const nums = marksixZodiacNumbers(zodiacCode)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onToggle(opt, displayGroupName, categoryName)}
                      className={cn(
                        BET_CELL_ROW,
                        BET_CELL_K3_RING,
                        '!justify-between !px-1.5',
                        isSelected && BET_SELECTED,
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-base font-semibold text-[#2c3345]">
                          {translateZodiacLabel(opt.label)}
                        </span>
                        <span className={BET_ODDS}>{opt.odds}</span>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                        {nums.map((n) => (
                          <MarkSixBall
                            key={n}
                            n={String(n)}
                            small
                            className="h-6 w-6 text-[11px]"
                          />
                        ))}
                      </div>
                    </button>
                  )
                }

                if (mode === 'number' && num) {
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onToggle(opt, displayGroupName, categoryName)}
                      className={cn(MARKSIX_HCELL, isSelected && BET_SELECTED)}
                    >
                      <MarkSixBall n={num} small className="mx-auto h-7 w-7 text-xs" />
                      <span className={MARKSIX_ODDS}>{opt.odds}</span>
                    </button>
                  )
                }

                const displayLabel = displaySideLabel(group.id, opt)
                const chipClass = isWaveOption(opt)
                  ? sideChipClass(opt.label)
                  : sideChipClass(displayLabel)

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt, displayGroupName, categoryName)}
                    className={cn(MARKSIX_HCELL, isSelected && BET_SELECTED)}
                  >
                    <span className={cn(MARKSIX_SIDE_CHIP, chipClass)}>{displayLabel}</span>
                    <span className={MARKSIX_ODDS}>{opt.odds}</span>
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
