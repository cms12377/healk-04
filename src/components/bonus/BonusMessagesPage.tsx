import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchSiteMessages } from '@/services/api'
import type { SiteMessage } from '@/types'
import { BonusSubNav } from './BonusSubNav'

interface BonusMessagesPageProps {
  onBack: () => void
  onMessageClick: (id: number) => void
  onPromotionsClick: () => void
  onCaijinClick: () => void
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim()
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString('th-TH')
}

export function BonusMessagesPage({
  onBack,
  onMessageClick,
  onPromotionsClick,
  onCaijinClick,
}: BonusMessagesPageProps) {
  const [messages, setMessages] = useState<SiteMessage[]>([])

  useEffect(() => {
    fetchSiteMessages().then(setMessages)
  }, [])

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-4">
      <PageNavBar title="ข้อความของฉัน" showBack backLabel="กลับ" onBack={onBack} />

      <BonusSubNav
        active="messages"
        onCaijin={onCaijinClick}
        onPromotions={onPromotionsClick}
        onMessages={() => undefined}
      />

      <div className="space-y-2.5 p-2.5">
        {messages.map((msg) => (
          <button
            key={msg.id}
            type="button"
            onClick={() => onMessageClick(msg.id)}
            className="w-full rounded-lg bg-white p-3 text-left shadow-sm"
          >
            <div className="mb-1 flex items-center gap-2">
              {!msg.read && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#ff3b2f]" />
              )}
              <span className="text-[15px] font-semibold text-[#333]">{msg.title}</span>
            </div>
            <p className="line-clamp-2 text-xs text-[#666]">{stripHtml(msg.content)}</p>
            <p className="mt-1 text-xs text-[#999]">{formatTime(msg.createtime)}</p>
          </button>
        ))}

        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อความ</p>
        )}
      </div>
    </div>
  )
}
