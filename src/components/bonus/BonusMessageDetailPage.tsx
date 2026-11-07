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
      if (msg) markSiteMessageRead(msg.id).catch(() => undefined)
    })
  }, [id])

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="ข้อความของฉัน" showBack backLabel="กลับ" onBack={onBack} />

      <div className="box-border w-full p-2.5">
        {message ? (
          <div className="mb-2.5 rounded-lg bg-white p-3 shadow-sm">
            <div
              className="w-full text-xs leading-relaxed text-[#666] [&_p]:m-0"
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
