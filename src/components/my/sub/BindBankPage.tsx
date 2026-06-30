import { useState } from 'react'
import { FormField, GreenButton, InputBox } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
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
    <SubPageShell title="เพิ่มบัญชีธนาคาร" variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm">
        <FormField label="ธนาคาร">
          <InputBox value={bankName} onChange={setBankName} placeholder="เช่น ธนาคารกสิกรไทย" />
        </FormField>
        <FormField label="ชื่อบัญชี">
          <InputBox value={bankUsername} onChange={setBankUsername} placeholder="ชื่อ-นามสกุล" />
        </FormField>
        <FormField label="เลขบัญชี">
          <InputBox value={bankCard} onChange={setBankCard} placeholder="xxx-x-xxxxx-x" />
        </FormField>
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังบันทึก...' : 'บันทึก'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
