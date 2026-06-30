import type { LotteryGameType } from '@/types'
import { getGameType } from '@/services/lotteryUtils'
import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { Pk10Ball, LabelChip } from '@/components/lottery/game/BallViews'
import {
  isRankGroupCode,
  isSumGroupCode,
  isTwoSideGroupCode,
  PK10_MAIN_TABS,
  translateBetLabel,
  translateCategoryName,
  translateGroupName,
  translateSumCategoryHeader,
  type Pk10MainTabKey,
} from '@/lib/gameLabels'
import { markSixBallClass } from '@/lib/drawDisplay'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import { GameSidebarLayout } from '@/components/lottery/game/GameSidebarLayout'
import { GenericLiangGuanBody } from '@/components/lottery/game/GenericLiangGuanBody'
import {
  buildGroupSidebarTabs,
  buildPk10SidebarTabs,
  usesVerticalSidebar,
} from '@/lib/gameNav'

interface GameBetAreaProps {
  code: string
  betGroups: BetGroup[]
  activeGroup: number
  onActiveGroup: (index: number) => void
  selected: SelectedBetItem[]
  onToggleBet: (option: BetOption, groupName: string, categoryName?: string) => void
}

const SIDE_LABELS = new Set([
  '大', '小', '单', '双', '龙', '虎', '和',
  'ใหญ่', 'เล็ก', 'คี่', 'คู่', 'มังกร', 'เสือ',
  'สูง', 'ต่ำ', 'เสมอ',
  '总大', '总小', '总单', '总双',
])

const BET_SELECTED =
  'border-2 border-[#4e72f3] bg-[#eef2ff] shadow-sm ring-1 ring-[#4e72f3]/15'
const BET_CELL =
  'bet-item flex min-h-[44px] flex-1 items-center justify-center bg-white px-2 transition-all active:scale-[0.98]'

const PK10_LIANG_GUAN_BALL: Record<number, string> = {
  1: 'bg-[#ffde66] text-[#333]',
  2: 'bg-[#028bf9] text-white',
  3: 'bg-[#2c2c2c] text-white',
  4: 'bg-[#f47901] text-white',
  5: 'bg-[#29c8c7] text-[#333]',
  6: 'bg-[#5200e0] text-white',
  7: 'bg-[#a3a29e] text-[#333]',
  8: 'bg-[#e60012] text-white',
  9: 'bg-[#772000] text-white',
  10: 'bg-[#ce3894] text-white',
}

function buildPk10Nav(groups: BetGroup[]): {
  twoSide?: BetGroup
  sumGroups: BetGroup[]
  rankGroups: BetGroup[]
} {
  const twoSide = groups.find((g) => isTwoSideGroupCode(g.id))
  const sumGroups = groups.filter((g) => isSumGroupCode(g.id))
  const rankGroups = groups.filter((g) => isRankGroupCode(g.id))
  return { twoSide, sumGroups, rankGroups }
}

function groupHasPick(group: BetGroup, selected: SelectedBetItem[]): boolean {
  if (group.options.some((o) => selected.some((s) => s.option.id === o.id))) return true
  return (
    group.categories?.some((c) =>
      c.options.some((o) => selected.some((s) => s.option.id === o.id)),
    ) ?? false
  )
}

function mergeAsCategories(
  groups: BetGroup[],
  nameFn: (g: BetGroup) => string,
): BetGroup['categories'] {
  return groups.map((g) => ({
    id: g.id,
    name: nameFn(g),
    options: g.options,
  }))
}

function flattenSumCategories(sumGroups: BetGroup[]): NonNullable<BetGroup['categories']> {
  return sumGroups.flatMap((g) => {
    if (g.categories && g.categories.length > 0) return g.categories
    return [
      {
        id: g.id,
        name: translateSumCategoryHeader(g.id, g.name),
        options: g.options,
      },
    ]
  })
}

function isSideBetOption(opt: BetOption): boolean {
  const bc = opt.betContent ?? ''
  if (
    /_(big|small|odd|even|dragon|tiger)$/.test(bc) ||
    /^(gy|gyj)_(big|small|odd|even)$/.test(bc)
  ) {
    return true
  }
  return SIDE_LABELS.has(opt.label) || SIDE_LABELS.has(translateBetLabel(opt.label))
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
  const pk10Nav = buildPk10Nav(betGroups)
  const isPk10Merged =
    gameType === 'pk10' &&
    (pk10Nav.twoSide || pk10Nav.sumGroups.length > 0 || pk10Nav.rankGroups.length > 0)
  const useSidebar = usesVerticalSidebar(gameType) && betGroups.length > 0

  const sidebarTabs = useMemo(() => {
    if (isPk10Merged) return buildPk10SidebarTabs(betGroups)
    return buildGroupSidebarTabs(betGroups)
  }, [betGroups, isPk10Merged])

  const [activeTabId, setActiveTabId] = useState('')

  useEffect(() => {
    if (!sidebarTabs.length) return
    if (!sidebarTabs.some((t) => t.id === activeTabId)) {
      const first = sidebarTabs[0].id
      setActiveTabId(first)
      if (!isPk10Merged) {
        const idx = betGroups.findIndex((g) => g.id === first)
        if (idx >= 0) onActiveGroup(idx)
      }
    }
  }, [sidebarTabs, activeTabId, betGroups, isPk10Merged, onActiveGroup])

  const pk10Tab = (isPk10Merged ? activeTabId : 'twoSide') as Pk10MainTabKey

  const pk10ActiveGroup = useMemo((): BetGroup | undefined => {
    if (!isPk10Merged) return undefined
    if (pk10Tab === 'twoSide') return pk10Nav.twoSide
    if (pk10Tab === 'sum') {
      if (pk10Nav.sumGroups.length === 0) return undefined
      const categories = flattenSumCategories(pk10Nav.sumGroups)
      return {
        id: 'sum-merged',
        name: PK10_MAIN_TABS.sum,
        options: [],
        categories: categories.length > 0 ? categories : undefined,
      }
    }
    if (pk10Nav.rankGroups.length === 0) return undefined
    return {
      id: 'rank-merged',
      name: PK10_MAIN_TABS.rank,
      options: [],
      categories: mergeAsCategories(pk10Nav.rankGroups, (g) =>
        translateGroupName(g.id, g.name),
      ),
    }
  }, [isPk10Merged, pk10Tab, pk10Nav])

  const genericActiveGroup = useMemo(
    () => betGroups.find((g) => g.id === activeTabId) ?? betGroups[activeGroup],
    [betGroups, activeTabId, activeGroup],
  )

  const handleSelectTab = (id: string) => {
    setActiveTabId(id)
    if (!isPk10Merged) {
      const idx = betGroups.findIndex((g) => g.id === id)
      if (idx >= 0) onActiveGroup(idx)
    }
  }

  const tabHasPick = (tabId: string) => {
    if (isPk10Merged) {
      if (tabId === 'twoSide' && pk10Nav.twoSide) return groupHasPick(pk10Nav.twoSide, selected)
      if (tabId === 'sum') return pk10Nav.sumGroups.some((g) => groupHasPick(g, selected))
      if (tabId === 'rank') return pk10Nav.rankGroups.some((g) => groupHasPick(g, selected))
      return false
    }
    const g = betGroups.find((x) => x.id === tabId)
    return g ? groupHasPick(g, selected) : false
  }

  if (betGroups.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-[#888]">
        ไม่พบรายการเดิมพัน — รัน{' '}
        <code className="text-xs">supabase/play_items_full.sql</code> ใน Supabase
      </p>
    )
  }

  if (useSidebar) {
    const tabs = sidebarTabs.map((t) => ({
      id: t.id,
      label: t.label,
      hasPick: tabHasPick(t.id),
    }))

    return (
      <GameSidebarLayout tabs={tabs} activeId={activeTabId} onSelect={handleSelectTab}>
        {isPk10Merged && pk10ActiveGroup ? (
          <Pk10LiangGuanBody
            group={pk10ActiveGroup}
            selected={selected}
            onToggle={onToggleBet}
            mode={pk10Tab}
          />
        ) : genericActiveGroup ? (
          <GenericLiangGuanBody
            gameType={gameType}
            group={genericActiveGroup}
            selected={selected}
            onToggle={onToggleBet}
          />
        ) : (
          <p className="p-4 text-center text-sm text-[#888]">ไม่มีรายการในหมวดนี้</p>
        )}
      </GameSidebarLayout>
    )
  }

  const currentGroup = betGroups[activeGroup]

  return (
    <>
      <div className="flex gap-2 overflow-x-auto border-b border-[#eee] bg-white px-2 py-2 shadow-sm">
        {betGroups.map((g, i) => {
          const hasPick = groupHasPick(g, selected)
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onActiveGroup(i)}
              className={cn(
                'relative shrink-0 rounded-md border px-3 py-2 text-sm transition-colors',
                activeGroup === i
                  ? 'border-[#6298d6] bg-[#6298d6] text-white'
                  : 'border-[#e5e5e5] bg-white text-[#333]',
                hasPick && activeGroup !== i && 'ring-1 ring-[#6298d6]',
              )}
            >
              {translateGroupName(g.id, g.name)}
            </button>
          )
        })}
      </div>

      <div className="scroll-parent min-h-0 bg-[#f5f5f9] pb-5">
        {currentGroup && (
          <BetGroupBody
            gameType={gameType}
            group={currentGroup}
            selected={selected}
            onToggle={onToggleBet}
          />
        )}
      </div>
    </>
  )
}

/** th6688 LiangGuan — category header + 2-col bet rows */
function Pk10LiangGuanBody({
  group,
  selected,
  onToggle,
  mode,
}: {
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
  mode: Pk10MainTabKey
}) {
  const displayGroupName = translateGroupName(group.id, group.name)

  const sections =
    group.categories && group.categories.length > 0
      ? group.categories
      : [{ id: group.id, name: displayGroupName, options: group.options }]

  return (
    <div className="w-full text-[#333]">
      {sections.map((cat) => (
        <div key={cat.id} className="mb-2 overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
          <div className="border-b border-gray-100 bg-gradient-to-r from-[#f8faff] to-white px-3 py-2.5 text-center text-sm font-semibold text-[#2c3345]">
            {translateCategoryName(cat.name)}
          </div>
          <div className="bet-row grid grid-cols-2 gap-px bg-gray-100 p-px">
            {cat.options.map((opt) => {
              const isSelected = selected.some((s) => s.option.id === opt.id)
              const displayLabel = translateBetLabel(opt.label)
              const num = Number(opt.label)
              const showSideChip = mode === 'twoSide' || (mode === 'sum' && isSideBetOption(opt))
              const showRankBall =
                mode === 'rank' && /^\d+$/.test(opt.label) && num >= 1 && num <= 10
              const showSumNumber =
                mode === 'sum' && /^\d+$/.test(opt.label) && num >= 3 && num <= 19

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onToggle(opt, displayGroupName, translateCategoryName(cat.name))
                  }
                  className={cn(BET_CELL, isSelected && BET_SELECTED)}
                >
                  {showSideChip ? (
                    <span
                      className={cn(
                        'mr-2 flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[14px] font-bold text-white',
                        sideChipClass(opt.label),
                      )}
                    >
                      {displayLabel}
                    </span>
                  ) : showRankBall ? (
                    <span
                      className={cn(
                        'mr-2 flex h-[30px] w-[30px] items-center justify-center rounded-[4px] text-[14px] font-bold',
                        PK10_LIANG_GUAN_BALL[num] ?? 'bg-[#9ca3af] text-white',
                      )}
                    >
                      {opt.label}
                    </span>
                  ) : showSumNumber ? (
                    <span className="mr-2 flex h-[30px] min-w-[30px] items-center justify-center rounded-[4px] border border-[#3a81e5] px-1 text-[14px] font-bold text-[#3a81e5]">
                      {opt.label}
                    </span>
                  ) : (
                    <span className="mr-2 text-sm font-bold">{displayLabel}</span>
                  )}
                  <span className="w-[70px] text-right text-sm font-semibold text-[#e53935]">
                    {opt.odds}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function BetGroupBody({
  gameType,
  group,
  selected,
  onToggle,
  twoSideMode,
}: {
  gameType: LotteryGameType
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
  twoSideMode?: boolean
}) {
  const displayGroupName = translateGroupName(group.id, group.name)

  if (group.categories && group.categories.length > 0) {
    return (
      <div className="space-y-2 p-2">
        {group.categories.map((cat) => (
          <div key={cat.id} className="overflow-hidden rounded-lg border border-[#eee] bg-white">
            <div className="border-b border-[#eee] bg-[#f8fcff] px-3 py-2 text-sm font-medium text-[#333]">
              {translateCategoryName(cat.name)}
            </div>
            <BetGrid
              gameType={gameType}
              groupName={displayGroupName}
              categoryName={translateCategoryName(cat.name)}
              options={cat.options}
              selected={selected}
              onToggle={onToggle}
              twoSide={twoSideMode ?? true}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-2">
      <BetGrid
        gameType={gameType}
        groupName={displayGroupName}
        options={group.options}
        selected={selected}
        onToggle={onToggle}
        twoSide={
          twoSideMode ??
          group.options.every((o) => SIDE_LABELS.has(o.label) || SIDE_LABELS.has(translateBetLabel(o.label)))
        }
      />
    </div>
  )
}

function BetGrid({
  gameType,
  groupName,
  categoryName,
  options,
  selected,
  onToggle,
  twoSide,
}: {
  gameType: LotteryGameType
  groupName: string
  categoryName?: string
  options: BetOption[]
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
  twoSide?: boolean
}) {
  const isPk10Number =
    gameType === 'pk10' &&
    options.length > 0 &&
    options.every((o) => /^\d+$/.test(o.label) && Number(o.label) >= 1 && Number(o.label) <= 10)

  const isMarkSixNumber =
    gameType === 'marksix' &&
    options.length > 0 &&
    /^\d+$/.test(options[0]?.label ?? '') &&
    Number(options[0]?.label) <= 49

  const gridClass = isPk10Number
    ? 'grid grid-cols-5 gap-[2px]'
    : twoSide
      ? 'grid grid-cols-2 gap-[2px]'
      : gridClassForGroup(gameType, groupName, options.length)

  return (
    <div className={gridClass}>
      {options.map((opt) => {
        const isSelected = selected.some((s) => s.option.id === opt.id)
        const isNum = /^\d+$/.test(opt.label)
        const displayLabel = translateBetLabel(opt.label)

        if (isPk10Number && isNum) {
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt, groupName, categoryName)}
              className={cn(
                'bet-item flex flex-col items-center justify-center gap-1 border border-[#eee] bg-white py-2',
                isSelected && 'border-[#6298d6] bg-[#eef4ff]',
              )}
            >
              <Pk10Ball n={opt.label} />
              <span className="text-xs text-[#d7524e]">{opt.odds}</span>
            </button>
          )
        }

        if (isMarkSixNumber && isNum) {
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt, groupName, categoryName)}
              className={cn(
                'bet-item flex items-center justify-between border border-[#eee] bg-white p-2',
                isSelected && 'border-[#6298d6] bg-[#eef4ff]',
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

        if (twoSide || SIDE_LABELS.has(opt.label)) {
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt, groupName, categoryName)}
              className={cn(
                'flex h-10 items-center justify-center border border-[#eee] text-sm font-bold text-white',
                isSelected ? 'ring-2 ring-[#6298d6] ring-offset-1' : '',
                sideChipClass(opt.label),
              )}
            >
              {displayLabel}
              <span className="ml-1.5 text-xs opacity-90">{opt.odds}</span>
            </button>
          )
        }

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt, groupName, categoryName)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-colors',
              isSelected
                ? 'border-[#6298d6] bg-[#6298d6] text-white'
                : 'border-[#e5e5e5] bg-white text-[#333]',
            )}
          >
            {gameType === 'k3' && isNum ? (
              <LabelChip label={displayLabel} />
            ) : (
              <div className="text-sm font-semibold">{displayLabel}</div>
            )}
            <div className={cn('text-xs', isSelected ? 'text-white/80' : 'text-[#d7524e]')}>
              {opt.odds}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function sideChipClass(label: string): string {
  const l = translateBetLabel(label)
  if (['สูง', 'ใหญ่', 'คี่', 'มังกร', 'รวมสูง', 'รวมคี่', 'รวมใหญ่', '大', '单', '龙', '总大', '总单'].includes(l) || ['大', '单', '龙', '总大', '总单', 'ใหญ่', 'คี่', 'มังกร'].includes(label)) {
    return 'bg-[#006cd5]'
  }
  if (['ต่ำ', 'เล็ก', 'คู่', 'เสือ', 'รวมต่ำ', 'รวมคู่', 'รวมเล็ก', '小', '双', '虎', '总小', '总双'].includes(l) || ['小', '双', '虎', '总小', '总双', 'เล็ก', 'คู่', 'เสือ'].includes(label)) {
    return 'bg-[#ffa735]'
  }
  if (l === 'เสมอ' || label === '和') return 'bg-[#54db46]'
  return 'bg-[#6298d6]'
}

function gridClassForGroup(gameType: LotteryGameType, groupName: string, count: number): string {
  if (gameType === 'marksix' && (groupName.includes('肖') || groupName.includes('波色'))) {
    return 'grid grid-cols-3 gap-2'
  }
  if (gameType === 'k3' && groupName.includes('和值')) {
    return 'grid grid-cols-4 gap-2'
  }
  if (gameType === 'lucky28' && groupName.includes('和值')) {
    return 'grid grid-cols-4 gap-2'
  }
  if (count > 20) return 'grid grid-cols-5 gap-2'
  if (count > 9) return 'grid grid-cols-4 gap-2'
  return 'grid grid-cols-3 gap-2'
}
