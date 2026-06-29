import { useState } from 'react'
import { FormField, GreenButton, InputBox, PageNavBar } from '@/components/common/PageNavBar'
import { addBankCard } from '@/services/wallet'

interface BindBankPageProps {
  onBack: () => void
}

export function BindBankPage({ onBack }: BindBankPageProps) {
  const [bankName, setBankName] = useState('')
  const [bankUsername, setBankUsername] = useState('')
  const [bankCard, setBankCard] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!bankName || !bankUsername || !bankCard) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setLoading(true)
    setError('')
    try {
      await addBankCard({ bankName, bankUsername, bankCard })
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5]">
      <PageNavBar title="เพิ่มบัญชีธนาคาร" variant="white" showBack onBack={onBack} />
      <div className="bg-white p-5 text-sm">
        <FormField label="ธนาคาร">
          <InputBox value={bankName} onChange={setBankName} placeholder="เช่น ธนาคารกสิกรไทย" />
        </FormField>
        <FormField label="ชื่อบัญชี">
          <InputBox value={bankUsername} onChange={setBankUsername} placeholder="ชื่อ-นามสกุล" />
        </FormField>
        <FormField label="เลขบัญชี">
          <InputBox value={bankCard} onChange={setBankCard} placeholder="xxx-x-xxxxx-x" />
        </FormField>
        {error && <p className="mb-2 text-red-500">{error}</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </div>
    </div>
  )
}
