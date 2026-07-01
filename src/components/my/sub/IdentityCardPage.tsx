import { useState } from 'react'
import { GreenButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { uploadIdentityDoc } from '@/lib/memberUploads'
import { submitIdentity } from '@/services/wallet'

interface IdentityCardPageProps {
  onBack: () => void
}

const inputClass =
  'mb-4 h-11 w-full rounded-xl border border-[#ebedf0] bg-[#fafbfc] px-3 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20'

function IdPhotoField({
  label,
  preview,
  onPick,
}: {
  label: string
  preview: string
  onPick: (file: File | undefined) => void
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-[#969799]">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0])}
        className="w-full text-sm text-[#646566]"
      />
      {preview && (
        <img
          src={preview}
          alt={label}
          className="mt-2 max-h-36 w-full rounded-lg border border-[#eee] object-contain"
        />
      )}
    </div>
  )
}

export function IdentityCardPage({ onBack }: IdentityCardPageProps) {
  const [realName, setRealName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState('')
  const [backPreview, setBackPreview] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const pickPhoto = (
    file: File | undefined,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
  ) => {
    if (!file) return
    setFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!realName.trim() || !idNumber.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [frontUrl, backUrl] = await Promise.all([
        frontFile ? uploadIdentityDoc(frontFile, 'front') : Promise.resolve(undefined),
        backFile ? uploadIdentityDoc(backFile, 'back') : Promise.resolve(undefined),
      ])
      await submitIdentity(realName.trim(), idNumber.trim(), frontUrl, backUrl)
      setDone(true)
      setTimeout(onBack, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubPageShell title="ยืนยันตัวตน" variant="white" onBack={onBack}>
      <SubCard className="mt-3 p-5 text-sm text-[#2c3345]">
        <p className="mb-3 text-xs text-[#969799]">
          กรอกชื่อ-นามสกุล เลขบัตร และอัปโหลดรูปบัตร (รอเจ้าหน้าที่ตรวจสอบ)
        </p>
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">ชื่อ-นามสกุล</label>
        <input
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
          placeholder="ชื่อ-นามสกุลตามบัตร"
          className={inputClass}
        />
        <label className="mb-1.5 block text-xs font-medium text-[#969799]">เลขบัตรประชาชน</label>
        <input
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder="เลขบัตรประชาชน"
          className={inputClass}
        />
        <IdPhotoField
          label="รูปด้านหน้าบัตร"
          preview={frontPreview}
          onPick={(f) => pickPhoto(f, setFrontFile, setFrontPreview)}
        />
        <IdPhotoField
          label="รูปด้านหลังบัตร (ถ้ามี)"
          preview={backPreview}
          onPick={(f) => pickPhoto(f, setBackFile, setBackPreview)}
        />
        {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
        {done && <p className="mb-2 text-sm text-[#2e7d32]">ส่งคำขอยืนยันตัวตนแล้ว</p>}
        <GreenButton onClick={handleSubmit}>
          {loading ? 'กำลังส่ง...' : 'ยืนยัน'}
        </GreenButton>
      </SubCard>
    </SubPageShell>
  )
}
