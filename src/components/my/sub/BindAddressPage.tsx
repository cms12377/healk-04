import { VirtualAddPage } from '@/components/my/sub/VirtualAddPage'

interface BindAddressPageProps {
  onBack: () => void
}

export function BindAddressPage({ onBack }: BindAddressPageProps) {
  return <VirtualAddPage onBack={onBack} title="ผูกที่อยู่กระเป๋า" />
}
