import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchSiteMessages } from '@/services/api'
import type { SiteMessage } from '@/types'

interface BonusMessagesPageProps {
  onBack: () => void
  onMessageClick: (id: number) => void
}

export function BonusMessagesPage({ onBack, onMessageClick }: BonusMessagesPageProps) {
  const [messages, setMessages] = useState<SiteMessage[]>([])

  useEffect(() => {
    fetchSiteMessages().then(setMessages).catch(() => setMessages([]))
  }, [])

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ข้อความของฉัน" showBack backLabel="กลับ" onBack={onBack} />

      <div className="box-border w-full p-2.5">
        {messages.map((msg) => (
          <button
            key={msg.id}
            type="button"
            onClick={() => onMessageClick(msg.id)}
            className="relative mb-2.5 w-full rounded-lg bg-white p-3 text-left shadow-sm active:bg-[#fafafa]"
          >
            {!msg.read && (
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#ee0a24]" />
            )}
            <div className="w-full text-xs leading-relaxed text-[#666]">
              <div
                className={`mb-2.5 w-full text-[15px] font-normal ${msg.read ? 'text-[#333]' : 'font-semibold text-[#222]'}`}
              >
                {msg.title}
              </div>
              <div
                className="line-clamp-3 w-full [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
            </div>
          </button>
        ))}

        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-[#888]">ไม่มีข้อความ</p>
        )}
      </div>
    </div>
  )
}
