import {
  BET_BODY_PAD,
  BET_CELL_COLUMN,
  BET_CELL_K3_RING,
  BET_GRID_K3,
  BET_SECTION_HEADER,
  BET_SECTION_K3,
  BET_SELECTED,
} from '@/components/lottery/game/betStyles'
import type { BetOption, SelectedBetItem } from '@/types'
import { K3DiceFace } from '@/components/lottery/game/K3DiceFace'
import { k3Combinations } from '@/lib/k3BetUtils'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'

/** th6688 SanBuTong — pick N distinct dice, auto-combine */
export function K3SanBuTongBody({
  groupName,
  categoryName,
  template,
  pickCount,
  selected,
  onReplaceGroupBets,
}: {
  groupName: string
  categoryName: string
  template: BetOption
  pickCount: 2 | 3
  selected: SelectedBetItem[]
  onReplaceGroupBets: (
    groupName: string,
    bets: { option: BetOption; categoryName?: string }[],
  ) => void
}) {
  const [picked, setPicked] = useState<number[]>([])

  const combos = useMemo(() => {
    if (picked.length < pickCount) return []
    return k3Combinations(picked, pickCount).map((c) => c.join(''))
  }, [picked, pickCount])

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

  const toggle = (n: number) => {
    setPicked((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    )
  }

  const activeInGroup = selected.filter((s) => s.groupName === groupName).length

  return (
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      <div className={BET_SECTION_K3}>
        <div className={BET_SECTION_HEADER}>{groupName}</div>
        <p className="flex items-center justify-between border-b border-[#dfe3eb] px-3 py-1.5 text-sm text-[#969799]">
          <span>
            จำนวนชุด:{' '}
            <span className="font-semibold text-[#3a81e5]">{activeInGroup}</span>
          </span>
          <span>
            อัตราจ่าย:{' '}
            <span className="font-semibold text-[#e53935]">{template.odds}</span>
          </span>
        </p>
        <div className={cn(BET_GRID_K3, 'grid-cols-2')}>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const isOn = picked.includes(n)
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                className={cn(
                  BET_CELL_COLUMN,
                  BET_CELL_K3_RING,
                  'w-full py-2',
                  isOn && BET_SELECTED,
                )}
              >
                <K3DiceFace value={n} size="md" />
              </button>
            )
          })}
        </div>
        {picked.length > 0 && picked.length < pickCount && (
          <p className="border-t border-[#dfe3eb] px-3 py-1.5 text-center text-sm text-[#969799]">
            เลือกอีก {pickCount - picked.length} ลูก (เลือกแล้ว {picked.length} ลูก)
          </p>
        )}
      </div>
    </div>
  )
}
