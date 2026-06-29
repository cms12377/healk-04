import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchSiteMessageById, markSiteMessageRead } from '@/services/api'
import type { SiteMessage } from '@/types'

interface BonusMessageDetailPageProps {
  id: number
  onBack: () => void
}

export function BonusMessageDetailPage({ id, onBack }: BonusMessageDetailPageProps) {
  const [message, setMessage] = useState<SiteMessage | null>(null)

  useEffect(() => {
    fetchSiteMessageById(id).then((msg) => {
      setMessage(msg ?? null)
      if (msg) markSiteMessageRead(msg.id)
    })
  }, [id])

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar title="ข้อความของฉัน" showBack backLabel="กลับ" onBack={onBack} />

      <div className="p-2.5">
        {message ? (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-[#333]">{message.title}</h2>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed text-[#555]"
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[#888]">ไม่พบข้อความ</p>
        )}
      </div>
    </div>
  )
}
