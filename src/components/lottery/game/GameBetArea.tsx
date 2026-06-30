import type { LotteryGameType } from '@/types'
import { getGameType } from '@/services/lotteryUtils'
import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { Pk10Ball, LabelChip } from '@/components/lottery/game/BallViews'
import { K3DiceRow } from '@/components/lottery/game/K3DiceFace'
import { parseK3DiceDigits } from '@/constants/k3Dice'
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
import { K3BetBody } from '@/components/lottery/game/K3BetBody'
import {
  BET_BODY_PAD,
  BET_CELL,
  BET_CELL_COLUMN,
  BET_GRID,
  BET_LABEL,
  BET_NUM_BOX,
  BET_ODDS,
  BET_ODDS_INLINE,
  BET_SECTION,
  BET_SECTION_HEADER,
  BET_SELECTED,
  BET_SIDE_CHIP,
  BET_TAB_ACTIVE,
  BET_TAB_HAS_PICK,
  BET_TAB_INACTIVE,
  sideChipClass,
} from '@/components/lottery/game/betStyles'
import {
  buildGroupSidebarTabs,
  buildK3SidebarTabs,
  buildPk10SidebarTabs,
  normalizeK3BetGroups,
  usesVerticalSidebar,
} from '@/lib/gameNav'

interface GameBetAreaProps {
  code: string
  betGroups: BetGroup[]
  activeGroup: number
  onActiveGroup: (index: number) => void
  selected: SelectedBetItem[]
  onToggleBet: (option: BetOption, groupName: string, categoryName?: string) => void
  onReplaceGroupBets?: (
    groupName: string,
    bets: { option: BetOption; categoryName?: string }[],
  ) => void
}

const SIDE_LABELS = new Set([
  '大', '小', '单', '双', '龙', '虎', '和',
  'ใหญ่', 'เล็ก', 'คี่', 'คู่', 'มังกร', 'เสือ',
  'สูง', 'ต่ำ', 'เสมอ',
  '总大', '总小', '总单', '总双',
])

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
  onReplaceGroupBets,
}: GameBetAreaProps) {
  const gameType = getGameType(code)
  const pk10Nav = buildPk10Nav(betGroups)
  const isPk10Merged =
    gameType === 'pk10' &&
    (pk10Nav.twoSide || pk10Nav.sumGroups.length > 0 || pk10Nav.rankGroups.length > 0)
  const useSidebar = usesVerticalSidebar(gameType) && betGroups.length > 0

  const k3Groups = useMemo(
    () => (gameType === 'k3' ? normalizeK3BetGroups(betGroups) : betGroups),
    [gameType, betGroups],
  )

  const sidebarTabs = useMemo(() => {
    if (isPk10Merged) return buildPk10SidebarTabs(betGroups)
    if (gameType === 'k3') return buildK3SidebarTabs(betGroups)
    return buildGroupSidebarTabs(betGroups)
  }, [betGroups, gameType, isPk10Merged])

  const [activeTabId, setActiveTabId] = useState('')

  useEffect(() => {
    if (!sidebarTabs.length) return
    if (!sidebarTabs.some((t) => t.id === activeTabId)) {
      const first = sidebarTabs[0].id
      setActiveTabId(first)
      if (!isPk10Merged) {
        const idx = k3Groups.findIndex((g) => g.id === first)
        if (idx >= 0) onActiveGroup(idx)
      }
    }
  }, [sidebarTabs, activeTabId, k3Groups, isPk10Merged, onActiveGroup])

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
    () => k3Groups.find((g) => g.id === activeTabId) ?? k3Groups[activeGroup],
    [k3Groups, activeTabId, activeGroup],
  )

  const handleSelectTab = (id: string) => {
    setActiveTabId(id)
    if (!isPk10Merged) {
      const idx = k3Groups.findIndex((g) => g.id === id)
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
    const g = k3Groups.find((x) => x.id === tabId)
    return g ? groupHasPick(g, selected) : false
  }

  if (betGroups.length === 0) {
    return (
      <div className="mx-2 mb-2 rounded-xl bg-white px-3 py-6 text-center ring-1 ring-black/5">
        <p className="text-base font-medium text-[#646566]">ยังไม่พร้อมให้แทง</p>
        <p className="mt-1 text-sm text-[#969799]">
          รายการเดิมพันยังไม่เปิดใช้งาน กรุณาลองใหม่ภายหลัง
        </p>
      </div>
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
          gameType === 'k3' ? (
            <K3BetBody
              group={genericActiveGroup}
              selected={selected}
              onToggle={onToggleBet}
              onReplaceGroupBets={onReplaceGroupBets ?? (() => undefined)}
            />
          ) : (
            <GenericLiangGuanBody
              gameType={gameType}
              group={genericActiveGroup}
              selected={selected}
              onToggle={onToggleBet}
            />
          )
        ) : (
          <p className="p-3 text-center text-base text-[#888]">ไม่มีรายการในหมวดนี้</p>
        )}
      </GameSidebarLayout>
    )
  }

  const currentGroup = betGroups[activeGroup]

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-[#eee] bg-white px-1 py-1 shadow-sm">
        {betGroups.map((g, i) => {
          const hasPick = groupHasPick(g, selected)
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onActiveGroup(i)}
              className={cn(
                'relative shrink-0 rounded-lg border px-2.5 py-1.5 text-base font-medium transition-colors',
                activeGroup === i ? BET_TAB_ACTIVE : BET_TAB_INACTIVE,
                hasPick && activeGroup !== i && BET_TAB_HAS_PICK,
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
    <div className={cn('w-full text-[#333]', BET_BODY_PAD)}>
      {sections.map((cat) => (
        <div key={cat.id} className={BET_SECTION}>
          <div className={BET_SECTION_HEADER}>{translateCategoryName(cat.name)}</div>
          <div className={cn(BET_GRID, 'grid-cols-2')}>
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
                  className={cn(BET_CELL, 'flex-1', isSelected && BET_SELECTED)}
                >
                  {showSideChip ? (
                    <span className={cn(BET_SIDE_CHIP, sideChipClass(opt.label))}>
                      {displayLabel}
                    </span>
                  ) : showRankBall ? (
                    <span
                      className={cn(
                        BET_SIDE_CHIP,
                        PK10_LIANG_GUAN_BALL[num] ?? 'bg-[#9ca3af] text-white',
                      )}
                    >
                      {opt.label}
                    </span>
                  ) : showSumNumber ? (
                    <span className={BET_NUM_BOX}>{opt.label}</span>
                  ) : (
                    <span className={BET_LABEL}>{displayLabel}</span>
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
      <div className="space-y-1 p-1">
        {group.categories.map((cat) => (
          <div key={cat.id} className={BET_SECTION}>
            <div className={BET_SECTION_HEADER}>{translateCategoryName(cat.name)}</div>
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
    <div className="p-1">
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
              className={cn(BET_CELL_COLUMN, isSelected && BET_SELECTED)}
            >
              <Pk10Ball n={opt.label} />
              <span className={BET_ODDS_INLINE}>{opt.odds}</span>
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
                'bet-item flex min-h-[48px] items-center justify-between bg-white px-2 transition-all active:scale-[0.98]',
                isSelected && BET_SELECTED,
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md text-base font-bold shadow-sm',
                  markSixBallClass(opt.label),
                )}
              >
                {opt.label.padStart(2, '0')}
              </span>
              <span className={BET_ODDS}>{opt.odds}</span>
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
                'flex h-11 items-center justify-center gap-1.5 text-base font-bold text-white transition-all active:scale-[0.98]',
                isSelected ? 'ring-2 ring-[#4e72f3] ring-offset-1' : '',
                sideChipClass(opt.label),
              )}
            >
              {displayLabel}
              <span className="text-sm opacity-90">{opt.odds}</span>
            </button>
          )
        }

        const k3Dice = gameType === 'k3' ? parseK3DiceDigits(opt.label, opt.betContent) : null

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt, groupName, categoryName)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition-all active:scale-[0.98]',
              isSelected
                ? 'border-[#4e72f3] bg-[#4e72f3] text-white shadow-sm'
                : 'border-[#ebedf0] bg-white text-[#2c3345]',
            )}
          >
            {k3Dice ? (
              <K3DiceRow values={k3Dice} size="md" />
            ) : gameType === 'k3' && isNum ? (
              <LabelChip label={displayLabel} />
            ) : (
              <div className="text-base font-semibold">{displayLabel}</div>
            )}
            <div className={cn('text-sm font-semibold', isSelected ? 'text-white/80' : 'text-[#e53935]')}>
              {opt.odds}
            </div>
          </button>
        )
      })}
    </div>
  )
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
