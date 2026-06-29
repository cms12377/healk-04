import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchServiceConfig } from '@/services/api'

interface ServicePageProps {
  onBack?: () => void
}

export function ServicePage({ onBack }: ServicePageProps) {
  const [serviceUrl, setServiceUrl] = useState('')

  useEffect(() => {
    fetchServiceConfig().then((cfg) => setServiceUrl(cfg.serviceUrl))
  }, [])

  return (
    <div className="flex h-[100dvh] flex-col pb-[50px]">
      <PageNavBar
        title="บริการลูกค้า"
        showBack={Boolean(onBack)}
        backLabel="กลับ"
        onBack={onBack}
      />
      {serviceUrl ? (
        <iframe
          title="บริการลูกค้า"
          src={serviceUrl}
          className="min-h-0 w-full flex-1 border-0"
        />
      ) : (
        <div className="grid flex-1 place-items-center text-[#888]">กำลังโหลด...</div>
      )}
    </div>
  )
}
