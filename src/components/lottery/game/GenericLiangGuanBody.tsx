import type { LotteryGameType } from '@/types'
import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { K3DiceRow } from '@/components/lottery/game/K3DiceFace'
import {
  BET_BODY_PAD,
  BET_CELL,
  BET_CELL_COLUMN,
  BET_CELL_K3,
  BET_CELL_ROW,
  BET_GRID,
  BET_LABEL,
  BET_NUM_BOX,
  BET_ODDS,
  BET_ODDS_INLINE,
  BET_SECTION,
  BET_SECTION_HEADER,
  BET_SELECTED,
  BET_SIDE_CHIP,
  sideChipClass,
} from '@/components/lottery/game/betStyles'
import {
  isSumGroupCode,
  isTwoSideGroupCode,
  translateBetLabel,
  translateCategoryName,
  translateGroupName,
  translateZodiacLabel,
} from '@/lib/gameLabels'
import { markSixBallClass } from '@/lib/drawDisplay'
import { parseK3DiceDigits } from '@/constants/k3Dice'
import { cn } from '@/lib/utils'

const SIDE_LABELS = new Set([
  '大', '小', '单', '双', '龙', '虎', '和',
  'ใหญ่', 'เล็ก', 'คี่', 'คู่', 'มังกร', 'เสือ',
  'สูง', 'ต่ำ', 'เสมอ',
  '总大', '总小', '总单', '总双',
  '红波', '绿波', '蓝波',
])

const BALL_GROUP_CODES = new Set(['ball1', 'b2', 'b3', 'b4', 'b5'])
const ZODIAC_GROUP_CODES = new Set(['tx', 'zx'])

type DisplayMode =
  | 'twoSide'
  | 'marksixNumber'
  | 'zodiac'
  | 'ballGrid'
  | 'sumGrid'
  | 'k3Dice'
  | 'k3Hz'
  | 'textGrid'
  | 'default'

function resolveDisplayMode(gameType: LotteryGameType, group: BetGroup): DisplayMode {
  const code = group.id
  if (code === 'nn') return 'textGrid'
  if (gameType === 'k3' && code === 'hz') return 'k3Hz'
  if (isTwoSideGroupCode(code) || code === 'bs' || code === 'lm') return 'twoSide'
  if (gameType === 'marksix' && (code === 'tm' || code === 'zm')) return 'marksixNumber'
  if (gameType === 'marksix' && ZODIAC_GROUP_CODES.has(code)) return 'zodiac'
  if (BALL_GROUP_CODES.has(code)) return 'ballGrid'
  if (isSumGroupCode(code)) return 'sumGrid'
  if (gameType === 'k3' && (code === 'sth' || code === 'slh' || code === 'eth')) return 'k3Dice'
  if (group.options.every((o) => SIDE_LABELS.has(o.label) || SIDE_LABELS.has(translateBetLabel(o.label)))) {
    return 'twoSide'
  }
  return 'default'
}

function gridColsClass(mode: DisplayMode): string {
  switch (mode) {
    case 'zodiac':
      return 'grid-cols-1'
    case 'ballGrid':
      return 'grid-cols-5'
    case 'sumGrid':
      return 'grid-cols-4'
    case 'k3Hz':
      return 'grid-cols-2'
    case 'textGrid':
      return 'grid-cols-3'
    case 'marksixNumber':
    case 'twoSide':
    case 'default':
    default:
      return 'grid-cols-2'
  }
}

function cellBaseClass(mode: DisplayMode): string {
  if (mode === 'k3Hz' || mode === 'k3Dice') {
    return BET_CELL_K3
  }
  if (
    mode === 'ballGrid' ||
    mode === 'sumGrid' ||
    mode === 'twoSide'
  ) {
    return BET_CELL_COLUMN
  }
  if (mode === 'zodiac') return BET_CELL_ROW
  return BET_CELL
}

function BetCell({
  opt,
  isSelected,
  mode,
  onClick,
}: {
  opt: BetOption
  isSelected: boolean
  mode: DisplayMode
  onClick: () => void
}) {
  const displayLabel =
    mode === 'zodiac' ? translateZodiacLabel(opt.label) : translateBetLabel(opt.label)
  const isNum = /^\d+$/.test(opt.label)
  const k3DiceValues =
    mode === 'k3Dice' ? parseK3DiceDigits(opt.label, opt.betContent) : null
  const isHzSide =
    mode === 'k3Hz' &&
    ['big', 'small', 'odd', 'even'].includes(opt.betContent ?? '')
  const isHzSum =
    mode === 'k3Hz' && /^\d{1,2}$/.test(opt.betContent ?? opt.label)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(cellBaseClass(mode), isSelected && BET_SELECTED)}
    >
      {mode === 'twoSide' || (mode === 'default' && SIDE_LABELS.has(opt.label)) ? (
        <>
          <span className={cn(BET_SIDE_CHIP, sideChipClass(opt.label))}>{displayLabel}</span>
          <span className={BET_ODDS_INLINE}>{opt.odds}</span>
        </>
      ) : mode === 'marksixNumber' && isNum ? (
        <>
          <span
            className={cn(
              BET_SIDE_CHIP,
              markSixBallClass(opt.label),
            )}
          >
            {opt.label.padStart(2, '0')}
          </span>
          <span className={cn(BET_ODDS, 'text-right')}>{opt.odds}</span>
        </>
      ) : mode === 'zodiac' ? (
        <>
          <span className={BET_LABEL}>{displayLabel}</span>
          <span className={BET_ODDS}>{opt.odds}</span>
        </>
      ) : mode === 'ballGrid' && isNum ? (
        <>
          <span className={cn(BET_NUM_BOX, 'border-[#4e72f3] text-[#4e72f3]')}>{opt.label}</span>
          <span className={BET_ODDS_INLINE}>{opt.odds}</span>
        </>
      ) : mode === 'sumGrid' && isNum ? (
        <>
          <span className={BET_NUM_BOX}>{opt.label}</span>
          <span className={BET_ODDS_INLINE}>{opt.odds}</span>
        </>
      ) : mode === 'k3Hz' && isHzSide ? (
        <>
          <span className={cn(BET_SIDE_CHIP, sideChipClass(opt.label))}>{displayLabel}</span>
          <span className={BET_ODDS_INLINE}>{opt.odds}</span>
        </>
      ) : mode === 'k3Hz' && isHzSum ? (
        <>
          <span className={BET_NUM_BOX}>{opt.label}</span>
          <span className={BET_ODDS_INLINE}>{opt.odds}</span>
        </>
      ) : mode === 'k3Dice' ? (
        <>
          {k3DiceValues ? (
            <K3DiceRow values={k3DiceValues} size="md" className="shrink-0" />
          ) : (
            <span className={cn(BET_LABEL, 'shrink-0')}>{displayLabel}</span>
          )}
          <span className={BET_ODDS_INLINE}>{opt.odds}</span>
        </>
      ) : (
        <>
          <span className={BET_LABEL}>{displayLabel}</span>
          <span className={cn(BET_ODDS, 'text-right')}>{opt.odds}</span>
        </>
      )}
    </button>
  )
}

/** K3 / Mark Six / Lucky28 / SSC — shared LiangGuan layout (matches PK10 polish) */
export function GenericLiangGuanBody({
  gameType,
  group,
  selected,
  onToggle,
}: {
  gameType: LotteryGameType
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
}) {
  const displayGroupName = translateGroupName(group.id, group.name)
  const mode = resolveDisplayMode(gameType, group)

  const sections =
    group.categories && group.categories.length > 0
      ? group.categories
      : [{ id: group.id, name: displayGroupName, options: group.options }]

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      {sections.map((cat) => (
        <div key={cat.id} className={BET_SECTION}>
          <div className={BET_SECTION_HEADER}>{translateCategoryName(cat.name)}</div>
          <div className={cn(BET_GRID, gridColsClass(mode))}>
            {cat.options.map((opt) => {
              const isSelected = selected.some((s) => s.option.id === opt.id)
              return (
                <BetCell
                  key={opt.id}
                  opt={opt}
                  isSelected={isSelected}
                  mode={mode}
                  onClick={() =>
                    onToggle(opt, displayGroupName, translateCategoryName(cat.name))
                  }
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
