import { ImagePlus, Paperclip, Send, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { uploadServiceChatAttachment } from '@/lib/serviceChatAttachment'
import type { ServiceChatUploadedAttachment } from '@/lib/serviceChatAttachment'
import { cn } from '@/lib/utils'

interface ServiceChatComposerProps {
  draft: string
  onDraftChange: (value: string) => void
  onSend: (payload: {
    content: string
    attachment?: ServiceChatUploadedAttachment
  }) => Promise<void>
  sending: boolean
  uploading: boolean
  placeholder?: string
  uploadRole: 'member' | 'staff' | 'guest'
  actorId?: number | string
  error?: string
}

export function ServiceChatComposer({
  draft,
  onDraftChange,
  onSend,
  sending,
  uploading,
  placeholder = 'พิมพ์ข้อความ...',
  uploadRole,
  actorId,
  error,
}: ServiceChatComposerProps) {
  const [pendingFile, setPendingFile] = useState<ServiceChatUploadedAttachment | null>(null)
  const [localError, setLocalError] = useState('')
  const [uploadingLocal, setUploadingLocal] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const busy = sending || uploading || uploadingLocal

  const handlePick = async (e: ChangeEvent<HTMLInputElement>, asImage: boolean) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLocalError('')
    setUploadingLocal(true)
    try {
      const uploaded = await uploadServiceChatAttachment(file, { role: uploadRole, actorId })
      if (asImage && uploaded.kind !== 'image') {
        setLocalError('กรุณาเลือกไฟล์รูปภาพ')
        return
      }
      setPendingFile(uploaded)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploadingLocal(false)
    }
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (busy) return
    if (!text && !pendingFile) return
    setLocalError('')
    try {
      await onSend({ content: text, attachment: pendingFile ?? undefined })
      onDraftChange('')
      setPendingFile(null)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'ส่งข้อความไม่สำเร็จ')
    }
  }

  const displayError = error || localError

  return (
    <div className="border-t border-[#e3e6ee] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#f5f7fb] px-3 py-2 text-sm text-[#2c3345]">
          {pendingFile.kind === 'image' ? (
            <img
              src={pendingFile.url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <Paperclip className="h-4 w-4 shrink-0 text-[#427ffa]" />
          )}
          <span className="min-w-0 flex-1 truncate">{pendingFile.name}</span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="text-[#969799] hover:text-[#ee0a24]"
            aria-label="ลบไฟล์แนบ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {displayError && (
        <p className="mb-2 text-center text-xs text-[#e53935]">{displayError}</p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handlePick(e, true)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,image/*"
          className="hidden"
          onChange={(e) => void handlePick(e, false)}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => imageInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#427ffa] hover:bg-[#eef2ff] disabled:opacity-50"
          aria-label="ส่งรูปภาพ"
          title="ส่งรูปภาพ"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#427ffa] hover:bg-[#eef2ff] disabled:opacity-50"
          aria-label="ส่งไฟล์"
          title="ส่งไฟล์"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={1}
          placeholder={placeholder}
          disabled={busy}
          className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl bg-[#f5f5f9] px-4 py-2.5 text-sm outline-none ring-1 ring-[#ebedf0] focus:ring-[#427ffa] disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
        />
        <button
          type="button"
          disabled={busy || (!draft.trim() && !pendingFile)}
          onClick={() => void handleSend()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#427ffa] text-white disabled:opacity-50"
          aria-label="ส่งข้อความ"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
