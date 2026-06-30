import type { BetOption, SelectedBetItem } from '@/types'
import { K3DiceFace, K3DiceRow } from '@/components/lottery/game/K3DiceFace'
import {
  BET_BODY_PAD,
  BET_CELL_COLUMN,
  BET_GRID,
  BET_PICK_META,
  BET_SECTION,
  BET_SELECTED,
} from '@/components/lottery/game/betStyles'
import { k3PairSingleCombos, parseErTongDanColumns } from '@/lib/k3BetUtils'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'

/** th6688 ErTongDan — 3-col grid, pair on top / single below per template column */
export function K3ErTongDanBody({
  groupName,
  template,
  selected,
  onReplaceGroupBets,
  categoryName,
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
  const columns = useMemo(
    () => parseErTongDanColumns(template.betContent ?? ''),
    [template.betContent],
  )

  const [pairCode, setPairCode] = useState<string | null>(null)
  const [singleDigit, setSingleDigit] = useState<number | null>(null)

  const combos = useMemo(() => {
    if (!pairCode || singleDigit == null) return []
    const pairDigit = Number(pairCode[0])
    if (Number.isNaN(pairDigit)) return []
    return k3PairSingleCombos(pairDigit, singleDigit)
  }, [pairCode, singleDigit])

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

  const togglePair = (code: string) => {
    setPairCode((prev) => (prev === code ? null : code))
  }

  const toggleSingle = (digit: number) => {
    setSingleDigit((prev) => (prev === digit ? null : digit))
  }

  const activeInGroup = selected.filter((s) => s.groupName === groupName).length

  if (columns.length === 0) {
    return (
      <div className="p-3 text-center text-base text-[#969799]">
        ไม่พบรายการคู่+เดี่ยว — ตรวจสอบข้อมูลในฐานข้อมูล
      </div>
    )
  }

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      <div className={BET_SECTION}>
        <div className={cn('flex items-center justify-between px-1.5 py-1', BET_PICK_META)}>
          <div className="min-w-0 flex-1" aria-hidden />
          <div className="shrink-0">
            จำนวนชุด:{' '}
            <span className="mr-2 font-semibold text-[#3a81e5]">{activeInGroup}</span>
            อัตราจ่าย:{' '}
            <span className="font-semibold text-[#ff3f3f]">{template.odds}</span>
          </div>
        </div>

        <div className={cn(BET_GRID, 'grid-cols-3 gap-0.5')}>
          {columns.map((col, index) => (
            <div
              key={col.code}
              className={cn('flex flex-col gap-0.5', index < 3 && 'mb-3')}
            >
              <button
                type="button"
                onClick={() => togglePair(col.code)}
                className={cn(
                  BET_CELL_COLUMN,
                  pairCode === col.code && BET_SELECTED,
                )}
              >
                <K3DiceRow
                  values={col.code.split('').map(Number)}
                  size="md"
                  className="gap-1"
                />
              </button>
              <button
                type="button"
                onClick={() => toggleSingle(col.single)}
                className={cn(
                  BET_CELL_COLUMN,
                  singleDigit === col.single && BET_SELECTED,
                )}
              >
                <K3DiceFace value={col.single} size="md" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
