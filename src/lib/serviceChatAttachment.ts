import { getOrCreateGuestKey } from '@/lib/serviceGuestKey'
import { requireSupabase } from '@/lib/supabase'

const BUCKET = 'site-assets'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_FILE_BYTES = 5 * 1024 * 1024

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const FILE_EXT = new Set(['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'])

export type ServiceChatAttachmentKind = 'image' | 'file'

export interface ServiceChatUploadedAttachment {
  url: string
  name: string
  mime: string
  kind: ServiceChatAttachmentKind
}

function pickExt(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (IMAGE_EXT.has(ext)) return ext === 'jpeg' ? 'jpg' : ext
  if (FILE_EXT.has(ext)) return ext
  if (file.type.startsWith('image/')) return 'jpg'
  return 'bin'
}

function resolveKind(file: File): ServiceChatAttachmentKind {
  if (file.type.startsWith('image/') || IMAGE_EXT.has(pickExt(file))) return 'image'
  return 'file'
}

function validateFile(file: File): ServiceChatAttachmentKind {
  const kind = resolveKind(file)
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
  if (file.size > max) {
    throw new Error(kind === 'image' ? 'รูปภาพใหญ่เกิน 5MB' : 'ไฟล์ใหญ่เกิน 5MB')
  }
  if (kind === 'file') {
    const ext = pickExt(file)
    if (!FILE_EXT.has(ext) && !file.type.startsWith('image/')) {
      throw new Error('รองรับ PDF, Word, Excel, TXT และรูปภาพเท่านั้น')
    }
  }
  return kind
}

function buildPath(role: 'member' | 'staff' | 'guest', actorId: string, ext: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  if (role === 'staff') return `service-chat/staff/${actorId}/${stamp}.${ext}`
  if (role === 'member') return `service-chat/u${actorId}/${stamp}.${ext}`
  return `service-chat/guest/${actorId}/${stamp}.${ext}`
}

export async function uploadServiceChatAttachment(
  file: File,
  opts: { role: 'member' | 'staff' | 'guest'; actorId?: number | string },
): Promise<ServiceChatUploadedAttachment> {
  const kind = validateFile(file)
  const ext = pickExt(file)
  const actorKey =
    opts.role === 'guest'
      ? String(opts.actorId ?? getOrCreateGuestKey())
      : String(opts.actorId ?? '0')
  const path = buildPath(opts.role, actorKey, ext)

  const client = requireSupabase()
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) {
    const msg = error.message.includes('Bucket not found')
      ? 'ยังไม่ได้ตั้งค่า Storage — รัน supabase/fix_service_chat_media.sql ใน Supabase'
      : error.message
    throw new Error(msg)
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: data.publicUrl,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    kind,
  }
}
