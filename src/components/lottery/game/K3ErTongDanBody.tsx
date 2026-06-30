import type { BetOption, SelectedBetItem } from '@/types'
import { K3DiceFace, K3DiceRow } from '@/components/lottery/game/K3DiceFace'
import {
  BET_CELL_COLUMN,
  BET_GRID,
  BET_SECTION,
  BET_SELECTED,
} from '@/components/lottery/game/betStyles'
import { k3PairSingleCombos } from '@/lib/k3BetUtils'
import { translateCategoryName } from '@/lib/gameLabels'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'

/** th6688 ErTongDan — pick pair + single, auto permute (112, 121, 211) */
export function K3ErTongDanBody({
  groupName,
  categoryName,
  template,
  selected,
  onReplaceGroupBets,
}: {
  groupName: string
  categoryName: string
  template: BetOption
  selected: SelectedBetItem[]
  onReplaceGroupBets: (
    groupName: string,
    bets: { option: BetOption; categoryName?: string }[],
  ) => void
}) {
  const [pairDigit, setPairDigit] = useState<number | null>(null)
  const [singleDigit, setSingleDigit] = useState<number | null>(null)

  const combos = useMemo(() => {
    if (pairDigit == null || singleDigit == null) return []
    return k3PairSingleCombos(pairDigit, singleDigit)
  }, [pairDigit, singleDigit])

  useEffect(() => {
    const bets = combos.map((code) => ({
      option: {
        ...template,
        id: `${template.id}-${code}`,
        label: code,
        betContent: code,
      },
      categoryName,
    }))
    onReplaceGroupBets(groupName, bets)
  }, [combos, template, groupName, categoryName, onReplaceGroupBets])

  const activeInGroup = selected.filter((s) => s.groupName === groupName).length

  return (
    <div className="w-full p-2 text-[#333]">
      <div className={BET_SECTION}>
        <div className="flex items-center justify-between px-2 py-2 text-sm">
          <span className="text-[#999]">{translateCategoryName(categoryName)}</span>
          <span className="text-[#999]">
            จำนวนชุด:{' '}
            <span className="font-semibold text-[#3a81e5]">{activeInGroup}</span>
            <span className="mx-1">·</span>
            อัตราจ่าย:{' '}
            <span className="font-semibold text-[#ff3f3f]">{template.odds}</span>
          </span>
        </div>

        <p className="mb-2 px-2 text-xs font-semibold text-[#646566]">เลือกคู่</p>
        <div className={cn(BET_GRID, 'mb-4 grid-cols-3')}>
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <button
              key={`p-${d}`}
              type="button"
              onClick={() => setPairDigit(d)}
              className={cn(BET_CELL_COLUMN, pairDigit === d && BET_SELECTED)}
            >
              <K3DiceRow values={[d, d]} size="sm" />
            </button>
          ))}
        </div>

        <p className="mb-2 px-2 text-xs font-semibold text-[#646566]">เลือกลูกเดี่ยว</p>
        <div className={cn(BET_GRID, 'grid-cols-3')}>
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <button
              key={`s-${d}`}
              type="button"
              onClick={() => setSingleDigit(d)}
              disabled={pairDigit === d}
              className={cn(
                BET_CELL_COLUMN,
                singleDigit === d && BET_SELECTED,
                pairDigit === d && 'opacity-40',
              )}
            >
              <K3DiceFace value={d} size="sm" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
