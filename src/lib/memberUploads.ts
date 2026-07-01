import { requireSupabase } from '@/lib/supabase'

const BUCKET = 'site-assets'
const MAX_BYTES = 512 * 1024
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

async function uploadMemberImage(
  file: File,
  folder: 'deposit-proofs' | 'identity-docs',
  label: string,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`กรุณาเลือกไฟล์รูป${label} (PNG, JPG, WebP)`)
  }
  if (file.size > MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 512KB — ลดขนาดรูปแล้วลองใหม่')
  }

  const client = requireSupabase()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบ')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const safeExt = ALLOWED_EXT.has(ext) ? ext : 'png'
  const path = `${folder}/${user.id}-${Date.now()}.${safeExt}`

  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    const msg = error.message.includes('Bucket not found')
      ? 'ยังไม่ได้ตั้งค่า Storage — รัน supabase/fix_member_uploads_storage.sql'
      : error.message.includes('policy')
        ? 'ไม่มีสิทธิ์อัปโหลด — รัน supabase/fix_member_uploads_storage.sql'
        : error.message
    throw new Error(msg)
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function uploadDepositProofSlip(file: File) {
  return uploadMemberImage(file, 'deposit-proofs', 'สลิป')
}

export function uploadIdentityDoc(file: File, side: 'front' | 'back') {
  return uploadMemberImage(file, 'identity-docs', side === 'front' ? 'ด้านหน้า' : 'ด้านหลัง')
}

/** Encode deposit proof for deposit_orders.proof_image (th6688-style review) */
export function encodeDepositProof(transferAt: string, slipUrl?: string): string {
  const parts = [`transfer_at:${transferAt}`]
  if (slipUrl?.trim()) parts.push(`slip:${slipUrl.trim()}`)
  return parts.join('|')
}

export type ParsedDepositProof = {
  transferAt?: string
  slipUrl?: string
  raw?: string
}

export function parseDepositProof(proof?: string): ParsedDepositProof | null {
  if (!proof?.trim()) return null
  const result: ParsedDepositProof = { raw: proof }
  for (const segment of proof.split('|')) {
    const idx = segment.indexOf(':')
    if (idx < 0) continue
    const key = segment.slice(0, idx)
    const val = segment.slice(idx + 1)
    if (key === 'transfer_at') result.transferAt = val
    if (key === 'slip') result.slipUrl = val
  }
  if (!result.transferAt && proof.startsWith('transfer_at:')) {
    result.transferAt = proof.slice('transfer_at:'.length)
  }
  if (!result.slipUrl && !result.transferAt && !proof.includes('|')) {
    if (proof.startsWith('http') || proof.startsWith('data:')) {
      result.slipUrl = proof
    } else {
      result.raw = proof
    }
  }
  return result
}
