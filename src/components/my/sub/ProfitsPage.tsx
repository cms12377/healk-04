import { useEffect, useState } from 'react'
import { PageNavBar, TabBar } from '@/components/common/PageNavBar'
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
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar
        title="สรุปกำไร-ขาดทุน"
        variant="white"
        showBack
        onBack={onBack}
        rightLabel="รายละเอียด"
        onRightClick={onBack}
      />
      <TabBar tabs={PROFIT_TABS} active={range} onChange={(v) => setRange(v as DateRangeKey)} />
      <div className="flex flex-col items-center bg-[#618fff] p-5">
        <div className="flex flex-col items-center gap-2.5">
          <h6 className="text-[30px] text-white">฿{summary.countWinAmount.toLocaleString()}</h6>
          <div className="text-white">กำไรรวม</div>
        </div>
        <div className="mt-5 flex w-full items-center justify-around">
          <div className="flex flex-col items-center gap-2.5">
            <h6 className="text-xl text-white">฿{summary.rechargeCount.toLocaleString()}</h6>
            <div className="text-sm text-white">ยอดฝาก</div>
          </div>
          <div className="flex flex-col items-center gap-2.5">
            <h6 className="text-xl text-white">฿{summary.withdrawCount.toLocaleString()}</h6>
            <div className="text-sm text-white">ยอดถอน</div>
          </div>
        </div>
      </div>
    </div>
  )
}
