import { useState } from 'react'
import { FormField, GreenButton, InputBox, PageNavBar } from '@/components/common/PageNavBar'
import { addCryptoWallet } from '@/services/wallet'

interface VirtualAddPageProps {
  onBack: () => void
}

export function VirtualAddPage({ onBack }: VirtualAddPageProps) {
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
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="เพิ่มกระเป๋าคริปโต" variant="white" showBack onBack={onBack} />
      <div className="bg-white p-5 text-sm">
        <FormField label="ชื่อกระเป๋า">
          <InputBox value={remark} onChange={setRemark} placeholder="เช่น USDT TRC20" />
        </FormField>
        <FormField label="ที่อยู่กระเป๋า">
          <InputBox value={address} onChange={setAddress} placeholder="Wallet address" />
        </FormField>
        {error && <p className="mb-2 text-red-500">{error}</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </div>
    </div>
  )
}
