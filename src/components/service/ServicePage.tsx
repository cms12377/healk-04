import { PageNavBar } from '@/components/common/PageNavBar'
import { ServiceChatView } from '@/components/service/ServiceChatView'
import { cn } from '@/lib/utils'

interface ServicePageProps {
  onBack?: () => void
  isTab?: boolean
}

export function ServicePage({ onBack, isTab = false }: ServicePageProps) {
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
        title="บริการลูกค้า"
        variant="blue"
        showBack={showBack}
        backLabel="กลับ"
        onBack={onBack}
      />
      <ServiceChatView />
    </div>
  )
}
