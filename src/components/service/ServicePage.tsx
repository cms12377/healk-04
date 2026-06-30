import { useCallback, useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { fetchServiceConfig } from '@/services/api'
import { cn } from '@/lib/utils'

const FALLBACK_SERVICE = '/service-frame.html'

interface ServicePageProps {
  /** When set, show back control (th6688 ServiceView navigates to home) */
  onBack?: () => void
  /** Main bottom-tab route — adjust height for fixed tab bar */
  isTab?: boolean
}

export function ServicePage({ onBack, isTab = false }: ServicePageProps) {
  const [serviceUrl, setServiceUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [frameReady, setFrameReady] = useState(false)

  useEffect(() => {
    setFrameReady(false)
  }, [serviceUrl])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchServiceConfig()
      .then((cfg) => {
        if (!cancelled) {
          setServiceUrl(cfg.serviceUrl?.trim() || FALLBACK_SERVICE)
        }
      })
      .catch(() => {
        if (!cancelled) setServiceUrl(FALLBACK_SERVICE)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleFrameLoad = useCallback(() => {
    setFrameReady(true)
  }, [])

  const showBack = Boolean(onBack)

  return (
    <div
      className={cn(
        'flex flex-col',
        isTab
          ? 'h-[calc(100dvh-56px-env(safe-area-inset-bottom,0px))]'
          : 'h-[100dvh]',
      )}
    >
      <PageNavBar
        title="ฝ่ายบริการ"
        variant="blue"
        showBack={showBack}
        backLabel="กลับ"
        onBack={onBack}
      />
      <div className="relative min-h-0 flex-1 bg-[#f5f5f5]">
        {loading ? (
          <div className="grid h-full place-items-center text-base text-[#888]">กำลังโหลด...</div>
        ) : serviceUrl ? (
          <>
            {!frameReady && (
              <div className="absolute inset-0 z-[1] grid place-items-center bg-[#f5f5f5] text-base text-[#888]">
                กำลังเชื่อมต่อแชท...
              </div>
            )}
            <iframe
              title="ฝ่ายบริการ"
              src={serviceUrl}
              className="h-full w-full border-0"
              allow="microphone; camera; clipboard-read; clipboard-write"
              onLoad={handleFrameLoad}
            />
          </>
        ) : (
          <div className="grid h-full place-items-center text-base text-[#888]">
            ไม่พบลิงก์ฝ่ายบริการ
          </div>
        )}
      </div>
    </div>
  )
}
