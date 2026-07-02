import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GreenButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { uploadIdentityDoc } from '@/lib/memberUploads'
import { IDENTITY_STATUS_CLASS, IDENTITY_STATUS_LABEL } from '@/lib/statusBadge'
import { submitIdentity } from '@/services/wallet'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface IdentityCardPageProps {
  onBack: () => void
}

const inputClass =
  'mb-4 h-11 w-full rounded-xl border border-[#ebedf0] bg-[#fafbfc] px-3 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20'

function IdPhotoField({
  label,
  preview,
  onPick,
  disabled,
}: {
  label: string
  preview: string
  onPick: (file: File | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-[#969799]">{label}</label>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => onPick(e.target.files?.[0])}
        className="w-full text-sm text-[#646566] disabled:opacity-50"
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

function IdentityStatusBanner({ status }: { status: string }) {
  const label = IDENTITY_STATUS_LABEL[status] ?? status
  const className = IDENTITY_STATUS_CLASS[status] ?? IDENTITY_STATUS_CLASS.none

  if (status === 'approved') {
    return (
      <div className="mb-4 flex flex-col items-center rounded-xl bg-[#e8f5e9] px-4 py-6 text-center ring-1 ring-[#c8e6c9]">
        <CheckCircle2 className="h-12 w-12 text-[#2e7d32]" strokeWidth={1.8} aria-hidden />
        <p className="mt-3 text-base font-semibold text-[#2e7d32]">ยืนยันตัวตนแล้ว</p>
        <p className="mt-1 text-xs text-[#388e3c]">
          บัญชีของคุณได้รับการยืนยันตัวตนเรียบร้อย
        </p>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#fff8e6] px-4 py-4 ring-1 ring-[#ffe0b2]">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#e65100]" aria-hidden />
        <div>
          <p className="font-semibold text-[#e65100]">รอตรวจสอบ</p>
          <p className="mt-1 text-xs text-[#f57c00]">
            ส่งคำขอยืนยันตัวตนแล้ว — กรุณารอเจ้าหน้าที่ตรวจสอบ
          </p>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#ffebee] px-4 py-4 ring-1 ring-[#ffcdd2]">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#c62828]" aria-hidden />
        <div>
          <p className="font-semibold text-[#c62828]">ยืนยันตัวตนไม่ผ่าน</p>
          <p className="mt-1 text-xs text-[#d32f2f]">
            กรุณาตรวจสอบข้อมูลและส่งคำขอใหม่อีกครั้ง
          </p>
        </div>
      </div>
    )
  }

  return (
    <span className={cn('mb-4 inline-block rounded-full px-2.5 py-1 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

export function IdentityCardPage({ onBack }: IdentityCardPageProps) {
  const { user, refreshUser } = useAuth()
  const identityStatus = user?.identityStatus ?? 'none'
  const isApproved = identityStatus === 'approved'
  const isPending = identityStatus === 'pending'
  const canSubmit = !isApproved && !isPending

  const [realName, setRealName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState('')
  const [backPreview, setBackPreview] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

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
      await refreshUser()
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
        <IdentityStatusBanner status={identityStatus} />

        {isApproved ? null : (
          <>
            {canSubmit && (
              <p className="mb-3 text-xs text-[#969799]">
                กรอกชื่อ-นามสกุล เลขบัตร และอัปโหลดรูปบัตร (รอเจ้าหน้าที่ตรวจสอบ)
              </p>
            )}
            <label className="mb-1.5 block text-xs font-medium text-[#969799]">ชื่อ-นามสกุล</label>
            <input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="ชื่อ-นามสกุลตามบัตร"
              disabled={!canSubmit}
              className={cn(inputClass, !canSubmit && 'opacity-60')}
            />
            <label className="mb-1.5 block text-xs font-medium text-[#969799]">เลขบัตรประชาชน</label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="เลขบัตรประชาชน"
              disabled={!canSubmit}
              className={cn(inputClass, !canSubmit && 'opacity-60')}
            />
            <IdPhotoField
              label="รูปด้านหน้าบัตร"
              preview={frontPreview}
              disabled={!canSubmit}
              onPick={(f) => pickPhoto(f, setFrontFile, setFrontPreview)}
            />
            <IdPhotoField
              label="รูปด้านหลังบัตร (ถ้ามี)"
              preview={backPreview}
              disabled={!canSubmit}
              onPick={(f) => pickPhoto(f, setBackFile, setBackPreview)}
            />
            {error && <p className="mb-2 text-sm text-[#e53935]">{error}</p>}
            {done && (
              <p className="mb-2 text-sm text-[#2e7d32]">ส่งคำขอยืนยันตัวตนแล้ว</p>
            )}
            {canSubmit && (
              <GreenButton onClick={handleSubmit}>
                {loading ? 'กำลังส่ง...' : 'ยืนยัน'}
              </GreenButton>
            )}
          </>
        )}
      </SubCard>
    </SubPageShell>
  )
}
