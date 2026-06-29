import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchGameRules, type GameRuleContent } from '@/services/gameRules'

interface LotteryRulePageProps {
  code: string
  onBack: () => void
}

export function LotteryRulePage({ code, onBack }: LotteryRulePageProps) {
  const [rules, setRules] = useState<GameRuleContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void fetchGameRules(code)
      .then(setRules)
      .catch(() =>
        setRules({ title: 'กติกาเกม', sections: [{ title: 'ข้อผิดพลาด', items: ['โหลดไม่สำเร็จ'] }] }),
      )
      .finally(() => setLoading(false))
  }, [code])

  if (loading || !rules) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <PageNavBar title="กติกาเกม" showBack backLabel="กลับ" onBack={onBack} />
        <p className="p-6 text-center text-sm text-[#888]">กำลังโหลดจากฐานข้อมูล...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar title="กติกาเกม" showBack backLabel="กลับ" onBack={onBack} />

      <div className="p-3">
        <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#333]">{rules.title}</h2>
          <p className="mt-1 text-sm text-[#888]">游戏规则 · Game Rules</p>
        </div>

        {rules.sections.map((section) => (
          <div key={section.title} className="mb-3 rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-[#427ffa]">{section.title}</h3>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#555]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#427ffa]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
