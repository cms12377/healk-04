import { useState } from 'react'
import { FormField, GreenButton, InputBox } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { addCryptoWallet } from '@/services/wallet'

interface VirtualAddPageProps {
  onBack: () => void
  title?: string
}

export function VirtualAddPage({ onBack, title = 'เพิ่มกระเป๋าคริปโต' }: VirtualAddPageProps) {
  const [remark, setRemark] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!remark || !address) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setLoading(true)
    try {
      await addCryptoWallet({ remark, address })
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title={title} variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm">
        <FormField label="ชื่อกระเป๋า">
          <InputBox value={remark} onChange={setRemark} placeholder="เช่น USDT TRC20" />
        </FormField>
        <FormField label="ที่อยู่กระเป๋า">
          <InputBox value={address} onChange={setAddress} placeholder="Wallet address" />
        </FormField>
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
