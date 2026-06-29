import type { LotteryGameType } from '@/types'
import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { LabelChip } from '@/components/lottery/game/BallViews'
import {
  isSumGroupCode,
  isTwoSideGroupCode,
  translateBetLabel,
  translateCategoryName,
  translateGroupName,
  translateZodiacLabel,
} from '@/lib/gameLabels'
import { k3CellClass, markSixBallClass } from '@/lib/drawDisplay'
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

function sideChipClass(label: string): string {
  const l = translateBetLabel(label)
  if (
    ['สูง', 'ใหญ่', 'คี่', 'มังกร', 'รวมสูง', 'รวมคี่', 'รวมใหญ่', '大', '单', '龙', '总大', '总单', 'แดง'].includes(l) ||
    ['大', '单', '龙', '总大', '总单', 'ใหญ่', 'คี่', 'มังกร', '红波'].includes(label)
  ) {
    return 'bg-[#006cd5]'
  }
  if (
    ['ต่ำ', 'เล็ก', 'คู่', 'เสือ', 'รวมต่ำ', 'รวมคู่', 'รวมเล็ก', '小', '双', '虎', '总小', '总双', 'เขียว'].includes(l) ||
    ['小', '双', '虎', '总小', '总双', 'เล็ก', 'คู่', 'เสือ', '绿波'].includes(label)
  ) {
    return 'bg-[#ffa735]'
  }
  if (l === 'เสมอ' || label === '和') return 'bg-[#54db46]'
  if (l === 'น้ำเงิน' || label === '蓝波') return 'bg-[#006cd5]'
  return 'bg-[#6298d6]'
}

type DisplayMode =
  | 'twoSide'
  | 'marksixNumber'
  | 'zodiac'
  | 'ballGrid'
  | 'sumGrid'
  | 'k3Dice'
  | 'default'

function resolveDisplayMode(gameType: LotteryGameType, group: BetGroup): DisplayMode {
  const code = group.id
  if (isTwoSideGroupCode(code) || code === 'bs' || code === 'lm') return 'twoSide'
  if (gameType === 'marksix' && (code === 'tm' || code === 'zm')) return 'marksixNumber'
  if (gameType === 'marksix' && ZODIAC_GROUP_CODES.has(code)) return 'zodiac'
  if (BALL_GROUP_CODES.has(code)) return 'ballGrid'
  if (isSumGroupCode(code)) return 'sumGrid'
  if (gameType === 'k3' && (code === 'sth' || code === 'slh')) return 'k3Dice'
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
    case 'marksixNumber':
    case 'twoSide':
    case 'default':
    default:
      return 'grid-cols-2'
  }
}

function BetCell({
  opt,
  isSelected,
  mode,
  k3Index,
  onClick,
}: {
  opt: BetOption
  isSelected: boolean
  mode: DisplayMode
  k3Index?: number
  onClick: () => void
}) {
  const displayLabel =
    mode === 'zodiac' ? translateZodiacLabel(opt.label) : translateBetLabel(opt.label)
  const isNum = /^\d+$/.test(opt.label)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'bet-item flex min-h-[44px] items-center justify-center border border-[#eee] border-r border-b bg-white px-1',
        mode === 'zodiac' && 'justify-between !px-[5px]',
        mode === 'ballGrid' && 'flex-col py-2',
        mode !== 'ballGrid' && mode !== 'zodiac' && 'h-[12vw]',
        isSelected &&
          'border-2 border-[#3a81e5] bg-white bg-[length:10px_10px] bg-[position:100%_100%] bg-no-repeat',
      )}
      style={
        isSelected
          ? {
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%233a81e5' d='M8 16l4 4 12-12'/%3E%3C/svg%3E\")",
            }
          : undefined
      }
    >
      {mode === 'twoSide' || (mode === 'default' && SIDE_LABELS.has(opt.label)) ? (
        <>
          <span
            className={cn(
              'mr-2 flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[14px] font-bold text-white',
              sideChipClass(opt.label),
            )}
          >
            {displayLabel}
          </span>
          <span className="w-[70px] text-[14px] text-[#d7524e]">{opt.odds}</span>
        </>
      ) : mode === 'marksixNumber' && isNum ? (
        <>
          <span
            className={cn(
              'mr-2 flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[14px] font-bold',
              markSixBallClass(opt.label),
            )}
          >
            {opt.label.padStart(2, '0')}
          </span>
          <span className="w-[70px] text-[14px] text-[#d7524e]">{opt.odds}</span>
        </>
      ) : mode === 'zodiac' ? (
        <>
          <span className="font-bold">{displayLabel}</span>
          <span className="text-[14px] text-[#d7524e]">{opt.odds}</span>
        </>
      ) : mode === 'ballGrid' && isNum ? (
        <>
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] border border-[#3a81e5] text-[14px] font-bold text-[#3a81e5]">
            {opt.label}
          </span>
          <span className="mt-1 text-xs text-[#d7524e]">{opt.odds}</span>
        </>
      ) : mode === 'sumGrid' && isNum ? (
        <>
          <span className="mr-2 flex h-[30px] min-w-[30px] items-center justify-center rounded-[4px] border border-[#3a81e5] px-1 text-[14px] font-bold text-[#3a81e5]">
            {opt.label}
          </span>
          <span className="w-[70px] text-[14px] text-[#d7524e]">{opt.odds}</span>
        </>
      ) : mode === 'k3Dice' ? (
        <>
          {k3Index != null && k3Index <= 2 && isNum ? (
            <LabelChip label={opt.label} />
          ) : (
            <span
              className={cn(
                'mr-2 flex h-[30px] min-w-[30px] items-center justify-center rounded-[4px] px-1 text-[14px] font-bold text-white',
                k3Index != null ? k3CellClass(opt.label, k3Index) : sideChipClass(opt.label),
              )}
            >
              {displayLabel}
            </span>
          )}
          <span className="w-[70px] text-[14px] text-[#d7524e]">{opt.odds}</span>
        </>
      ) : (
        <>
          <span className="mr-2 text-sm font-bold">{displayLabel}</span>
          <span className="w-[70px] text-[14px] text-[#d7524e]">{opt.odds}</span>
        </>
      )}
    </button>
  )
}

/** th6688 LiangGuan layout for K3 / Mark Six / Lucky28 / SSC */
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
    <div className="w-full text-[#333]">
      {sections.map((cat) => (
        <div key={cat.id} className="w-full bg-white p-[5px]">
          <div className="w-full py-[5px] text-center text-[16px] font-normal">
            {translateCategoryName(cat.name)}
          </div>
          <div className={cn('bet-row grid gap-[2px] bg-[#dee0e1]', gridColsClass(mode))}>
            {cat.options.map((opt, idx) => {
              const isSelected = selected.some((s) => s.option.id === opt.id)
              return (
                <BetCell
                  key={opt.id}
                  opt={opt}
                  isSelected={isSelected}
                  mode={mode}
                  k3Index={mode === 'k3Dice' ? idx : undefined}
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
