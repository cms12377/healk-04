import type { BetOption, SelectedBetItem } from '@/types'
import { K3DiceFace, K3DiceRow } from '@/components/lottery/game/K3DiceFace'
import {
  BET_BODY_PAD,
  BET_CELL_COLUMN,
  BET_CELL_K3_RING,
  BET_GRID_K3,
  BET_SECTION_HEADER,
  BET_SECTION_K3,
  BET_SELECTED,
} from '@/components/lottery/game/betStyles'
import { k3PairSingleCombos, parseErTongDanColumns } from '@/lib/k3BetUtils'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'

/**. ErTongDan — 3-col grid, pair on top / single below per template column */
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
        ไม่พบรายการคู่เหมือนแบบเดี่ยว — ตรวจสอบข้อมูลในฐานข้อมูล
      </div>
    )
  }

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      <div className={BET_SECTION_K3}>
        <div className={BET_SECTION_HEADER}>{groupName}</div>
        <p className="flex items-center justify-end gap-3 border-b border-[#dfe3eb] px-3 py-1.5 text-sm text-[#969799]">
          <span>
            จำนวนชุด:{' '}
            <span className="font-semibold text-[#3a81e5]">{activeInGroup}</span>
          </span>
          <span>
            อัตราจ่าย:{' '}
            <span className="font-semibold text-[#e53935]">{template.odds}</span>
          </span>
        </p>

        <div className={cn(BET_GRID_K3, 'grid-cols-3')}>
          {columns.map((col) => (
            <div key={col.code} className="flex flex-col gap-[2px]">
              <button
                type="button"
                onClick={() => togglePair(col.code)}
                className={cn(
                  BET_CELL_COLUMN,
                  BET_CELL_K3_RING,
                  'w-full gap-1 py-2',
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
                  BET_CELL_K3_RING,
                  'w-full py-2',
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
