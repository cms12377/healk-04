import { requireSupabase } from '@/lib/supabase'

const BUCKET = 'site-assets'
const MAX_BYTES = 512 * 1024
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

/** Member QR: admin image URL first, else auto-generate from wallet address */
export function resolveDepositQrcodeSrc(
  qrcode: string | undefined,
  fallbackData: string,
  size = 160,
): string {
  const custom = qrcode?.trim()
  if (custom) return custom
  const data = fallbackData.trim()
  if (!data) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

export async function uploadRechargeQrcode(file: File, channelId?: number): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP)')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 512KB — ลดขนาดรูปแล้วลองใหม่')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const safeExt = ALLOWED_EXT.has(ext) ? ext : 'png'
  const prefix = channelId ? `channel-${channelId}` : 'new'
  const path = `recharge-qrcodes/${prefix}-${Date.now()}.${safeExt}`

  const client = requireSupabase()
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    const msg = error.message.includes('Bucket not found')
      ? 'ยังไม่ได้ตั้งค่า Storage — รัน supabase/fix_recharge_qrcode_storage.sql ใน Supabase'
      : error.message
    throw new Error(msg)
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
