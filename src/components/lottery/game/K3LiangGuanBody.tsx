import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { K3DiceRow } from '@/components/lottery/game/K3DiceFace'
import {
  BET_BODY_PAD,
  BET_CELL,
  BET_CELL_COLUMN,
  BET_CELL_K3_RING,
  BET_CELL_PK10_SUM_LEFT,
  BET_CELL_PK10_SUM_RIGHT,
  BET_GRID_K3,
  BET_GRID_PK10_SUM,
  BET_LABEL,
  BET_NUM_BOX,
  BET_ODDS,
  BET_ODDS_ALIGN,
  BET_ODDS_INLINE,
  BET_SECTION_HEADER,
  BET_SECTION_K3,
  BET_SELECTED,
  BET_SIDE_CHIP,
  sideChipClass,
} from '@/components/lottery/game/betStyles'
import { translateBetLabel, translateCategoryName, translateGroupName } from '@/lib/gameLabels'
import { parseK3DiceDigits } from '@/constants/k3Dice'
import { cn } from '@/lib/utils'

function isK3HzSideOption(opt: BetOption): boolean {
  const bc = opt.betContent ?? ''
  return ['big', 'small', 'odd', 'even'].includes(bc)
}

function isK3HzSumOption(opt: BetOption): boolean {
  const raw = opt.betContent ?? opt.label
  const num = Number(raw)
  return /^\d{1,2}$/.test(raw) && num >= 3 && num <= 18
}

const K3_DICE_COLUMN_GROUPS = new Set(['slh', 'sth', 'eth'])

function K3DiceColumnBody({
  group,
  displayGroupName,
  selected,
  onToggle,
}: {
  group: BetGroup
  displayGroupName: string
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
}) {
  const categoryName = translateGroupName(group.id, group.name)
  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      <div className={BET_SECTION_K3}>
        <div className={BET_SECTION_HEADER}>{categoryName}</div>
        <div className={cn(BET_GRID_K3, 'grid-cols-2')}>
          {group.options.map((opt) => {
            const isSelected = selected.some((s) => s.option.id === opt.id)
            const diceValues = parseK3DiceDigits(opt.label, opt.betContent)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggle(opt, displayGroupName, categoryName)}
                className={cn(
                  BET_CELL_COLUMN,
                  BET_CELL_K3_RING,
                  'w-full gap-1 py-2',
                  isSelected && BET_SELECTED,
                )}
              >
                {diceValues ? (
                  <K3DiceRow values={diceValues} size="md" className="shrink-0" />
                ) : null}
                <span className={BET_ODDS_INLINE}>{opt.odds}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** K3 hz / sth / slh / eth — PK10-style LiangGuan layout */
export function K3LiangGuanBody({
  group,
  selected,
  onToggle,
}: {
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
}) {
  const displayGroupName = translateGroupName(group.id, group.name)

  if (group.id === 'hz') {
    const sideOpts = group.options.filter(isK3HzSideOption)
    const sumOpts = group.options.filter(isK3HzSumOption)
    const categoryName = translateGroupName(group.id, group.name)

    return (
      <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
        <div className={BET_SECTION_K3}>
          <div className={BET_SECTION_HEADER}>{categoryName}</div>
          {sideOpts.length > 0 && (
            <div className={cn(BET_GRID_K3, 'grid-cols-2')}>
              {sideOpts.map((opt) => {
                const isSelected = selected.some((s) => s.option.id === opt.id)
                const displayLabel = translateBetLabel(opt.label, opt.betContent)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt, displayGroupName, categoryName)}
                    className={cn(BET_CELL, BET_CELL_K3_RING, 'w-full', isSelected && BET_SELECTED)}
                  >
                    <span className={cn(BET_SIDE_CHIP, sideChipClass(opt.label))}>
                      {displayLabel}
                    </span>
                    <span className={BET_ODDS}>{opt.odds}</span>
                  </button>
                )
              })}
            </div>
          )}
          {sumOpts.length > 0 && (
            <div className={cn(BET_GRID_PK10_SUM, sideOpts.length > 0 && 'border-t border-[#dfe3eb]')}>
              {sumOpts.map((opt, index) => {
                const isSelected = selected.some((s) => s.option.id === opt.id)
                const isLeftCol = index % 2 === 0
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt, displayGroupName, categoryName)}
                    className={cn(
                      isLeftCol ? BET_CELL_PK10_SUM_LEFT : BET_CELL_PK10_SUM_RIGHT,
                      'w-full',
                      isSelected && BET_SELECTED,
                    )}
                  >
                    {isLeftCol ? (
                      <>
                        <span aria-hidden className="min-w-0" />
                        <span className={BET_NUM_BOX}>{opt.label}</span>
                        <span className={BET_ODDS_ALIGN}>{opt.odds}</span>
                      </>
                    ) : (
                      <>
                        <span className={BET_NUM_BOX}>{opt.label}</span>
                        <span className={BET_ODDS_ALIGN}>{opt.odds}</span>
                        <span aria-hidden className="min-w-0" />
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (K3_DICE_COLUMN_GROUPS.has(group.id)) {
    return (
      <K3DiceColumnBody
        group={group}
        displayGroupName={displayGroupName}
        selected={selected}
        onToggle={onToggle}
      />
    )
  }

  const sections =
    group.categories && group.categories.length > 0
      ? group.categories
      : [{ id: group.id, name: displayGroupName, options: group.options }]

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      {sections.map((cat) => (
        <div key={cat.id} className={BET_SECTION_K3}>
          <div className={BET_SECTION_HEADER}>{translateCategoryName(cat.name)}</div>
          <div className={cn(BET_GRID_K3, 'grid-cols-2')}>
            {cat.options.map((opt) => {
              const isSelected = selected.some((s) => s.option.id === opt.id)
              const displayLabel = translateBetLabel(opt.label, opt.betContent)
              const diceValues = parseK3DiceDigits(opt.label, opt.betContent)

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onToggle(opt, displayGroupName, translateCategoryName(cat.name))
                  }
                  className={cn(BET_CELL, BET_CELL_K3_RING, 'w-full', isSelected && BET_SELECTED)}
                >
                  {diceValues ? (
                    <K3DiceRow values={diceValues} size="md" className="shrink-0" />
                  ) : (
                    <span className={cn(BET_LABEL, 'text-sm')}>{displayLabel}</span>
                  )}
                  <span className={BET_ODDS}>{opt.odds}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
