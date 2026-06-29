import type { LotteryGameType } from '@/types'
import { getGameType } from '@/services/lotteryUtils'
import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { markSixBallClass } from '@/lib/drawDisplay'
import { cn } from '@/lib/utils'

interface GameBetAreaProps {
  code: string
  betGroups: BetGroup[]
  activeGroup: number
  onActiveGroup: (index: number) => void
  selected: SelectedBetItem[]
  onToggleBet: (option: BetOption, groupName: string) => void
}

export function GameBetArea({
  code,
  betGroups,
  activeGroup,
  onActiveGroup,
  selected,
  onToggleBet,
}: GameBetAreaProps) {
  const gameType = getGameType(code)
  const currentGroup = betGroups[activeGroup]

  if (betGroups.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-[#888]">
        ไม่พบรายการเดิมพัน — ตรวจสอบ play_groups / play_items ในฐานข้อมูล
      </p>
    )
  }

  return (
    <>
      <div className="flex gap-1 overflow-x-auto bg-white px-2 py-2 shadow-sm">
        {betGroups.map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onActiveGroup(i)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm',
              activeGroup === i ? 'bg-[#86aeff] text-white' : 'bg-[#f5f5f9] text-[#333]',
              g.options.some((o) => selected.some((s) => s.option.id === o.id)) && activeGroup !== i
                ? 'ring-1 ring-[#86aeff]'
                : '',
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="scroll-parent bg-[#f5f5f9] p-3">
        {currentGroup && (
          <BetGrid
            gameType={gameType}
            groupName={currentGroup.name}
            options={currentGroup.options}
            selected={selected}
            onToggle={onToggleBet}
          />
        )}
      </div>
    </>
  )
}

function gridClassForGroup(gameType: LotteryGameType, groupName: string, count: number): string {
  if (gameType === 'marksix' && (groupName.includes('特码') || groupName.includes('正码'))) {
    return 'grid grid-cols-2 gap-[2px]'
  }
  if (gameType === 'marksix' && (groupName.includes('肖') || groupName.includes('波色'))) {
    return 'grid grid-cols-3 gap-2'
  }
  if (gameType === 'k3' && groupName.includes('和值')) {
    return 'grid grid-cols-4 gap-2'
  }
  if (gameType === 'lucky28' && groupName.includes('和值')) {
    return 'grid grid-cols-4 gap-2'
  }
  if (gameType === 'pk10' && /冠军|亚军|第/.test(groupName)) {
    return 'grid grid-cols-5 gap-2'
  }
  if (count > 20) return 'grid grid-cols-5 gap-2'
  if (count > 9) return 'grid grid-cols-4 gap-2'
  return 'grid grid-cols-3 gap-2'
}

function BetGrid({
  gameType,
  groupName,
  options,
  selected,
  onToggle,
}: {
  gameType: LotteryGameType
  groupName: string
  options: BetOption[]
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string) => void
}) {
  const isMarkSixNumber =
    gameType === 'marksix' &&
    /^\d+$/.test(options[0]?.label ?? '') &&
    (groupName.includes('特码') || groupName.includes('正码'))
  const isK3 = gameType === 'k3'
  const gridClass = gridClassForGroup(gameType, groupName, options.length)

  return (
    <div className={gridClass}>
      {options.map((opt) => {
        const isSelected = selected.some((s) => s.option.id === opt.id)
        const isNum = /^\d+$/.test(opt.label)

        if (isMarkSixNumber && isNum) {
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt, groupName)}
              className={cn(
                'bet-item flex items-center justify-between rounded border p-2',
                isSelected ? 'border-[#86aeff] bg-[#eef4ff]' : 'border-[#eee] bg-white',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded font-bold',
                  markSixBallClass(opt.label),
                )}
              >
                {opt.label.padStart(2, '0')}
              </span>
              <span className="text-sm text-[#d7524e]">{opt.odds}</span>
            </button>
          )
        }

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt, groupName)}
            className={cn(
              'rounded-lg border p-3 text-center transition-colors',
              isSelected
                ? 'border-[#86aeff] bg-[#86aeff] text-white'
                : 'border-[#e5e5e5] bg-white text-[#333]',
              isK3 && isNum && !isSelected && 'font-bold text-[#3a81e5]',
            )}
          >
            <div className="text-sm font-semibold">{opt.label}</div>
            <div className={cn('text-xs', isSelected ? 'text-white/80' : 'text-[#d7524e]')}>
              {opt.odds}
            </div>
          </button>
        )
      })}
    </div>
  )
}
