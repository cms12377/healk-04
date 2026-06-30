import { useEffect, useState } from 'react'
import { TabBar } from '@/components/common/PageNavBar'
import { SubPageShell } from '@/components/my/sub/SubPageShell'
import { getProfitSummary, PROFIT_TABS } from '@/services/wallet'
import type { DateRangeKey, ProfitSummary } from '@/types'

interface ProfitsPageProps {
  onBack: () => void
}

export function ProfitsPage({ onBack }: ProfitsPageProps) {
  const [range, setRange] = useState<DateRangeKey>('last7Days')
  const [summary, setSummary] = useState<ProfitSummary>({
    countWinAmount: 0,
    rechargeCount: 0,
    withdrawCount: 0,
  })

  useEffect(() => {
    void getProfitSummary(range).then(setSummary).catch(() => {})
  }, [range])

  return (
    <SubPageShell
      title="สรุปกำไร-ขาดทุน"
      variant="white"
      onBack={onBack}
      rightLabel="รายละเอียด"
      onRightClick={onBack}
    >
      <TabBar
        tabs={PROFIT_TABS}
        active={range}
        onChange={(v) => setRange(v as DateRangeKey)}
        variant="pill"
      />
      <div className="mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3880e5] via-[#4e72f3] to-[#86a7ff] p-6 shadow-lg shadow-[#3880e5]/20">
        <div className="flex flex-col items-center gap-1 text-center text-white">
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            ฿{summary.countWinAmount.toLocaleString()}
          </p>
          <p className="text-sm text-white/85">กำไรรวม</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 px-3 py-3 text-center ring-1 ring-white/20">
            <p className="text-lg font-bold tabular-nums text-white">
              ฿{summary.rechargeCount.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-white/80">ยอดฝาก</p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-3 text-center ring-1 ring-white/20">
            <p className="text-lg font-bold tabular-nums text-white">
              ฿{summary.withdrawCount.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-white/80">ยอดถอน</p>
          </div>
        </div>
      </div>
    </SubPageShell>
  )
}
