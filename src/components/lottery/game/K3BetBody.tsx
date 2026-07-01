import type { BetGroup } from '@/services/lottery'
import type { BetOption, SelectedBetItem } from '@/types'
import { K3ErTongDanBody } from '@/components/lottery/game/K3ErTongDanBody'
import { K3LiangGuanBody } from '@/components/lottery/game/K3LiangGuanBody'
import { K3SanBuTongBody } from '@/components/lottery/game/K3SanBuTongBody'
import { isK3TemplateBetContent } from '@/lib/k3BetUtils'
import { translateCategoryName, translateGroupName } from '@/lib/gameLabels'

export function K3BetBody({
  group,
  selected,
  onToggle,
  onReplaceGroupBets,
}: {
  group: BetGroup
  selected: SelectedBetItem[]
  onToggle: (option: BetOption, groupName: string, categoryName?: string) => void
  onReplaceGroupBets: (
    groupName: string,
    bets: { option: BetOption; categoryName?: string }[],
  ) => void
}) {
  const displayGroupName = translateGroupName(group.id, group.name)
  const template = group.options.find((o) => isK3TemplateBetContent(o.betContent ?? ''))

  if (group.id === 'sbdh' && template) {
    return (
      <K3SanBuTongBody
        groupName={displayGroupName}
        categoryName={translateCategoryName(group.name)}
        template={template}
        pickCount={3}
        selected={selected}
        onReplaceGroupBets={onReplaceGroupBets}
      />
    )
  }

  if (group.id === 'ebdh' && template) {
    return (
      <K3SanBuTongBody
        groupName={displayGroupName}
        categoryName={translateCategoryName(group.name)}
        template={template}
        pickCount={2}
        selected={selected}
        onReplaceGroupBets={onReplaceGroupBets}
      />
    )
  }

  if (group.id === 'etdx' && template) {
    return (
      <K3ErTongDanBody
        groupName={displayGroupName}
        categoryName={translateCategoryName(group.name)}
        template={template}
        selected={selected}
        onReplaceGroupBets={onReplaceGroupBets}
      />
    )
  }

  return (
    <K3LiangGuanBody group={group} selected={selected} onToggle={onToggle} />
  )
}
