import { FileText, Trash2 } from 'lucide-react'
import type { RefObject } from 'react'
import type { ServiceChatMessage } from '@/types'
import { cn } from '@/lib/utils'

export type ServiceChatViewMode = 'member' | 'staff'

interface ServiceChatMessageListProps {
  messages: ServiceChatMessage[]
  mode: ServiceChatViewMode
  formatTime: (ts: number) => string
  bottomRef?: RefObject<HTMLDivElement | null>
  onRecall?: (messageId: number) => void
  recallingId?: number | null
}

function canRecall(msg: ServiceChatMessage, mode: ServiceChatViewMode): boolean {
  if (msg.isDeleted || msg.senderType === 'system') return false
  return mode === 'member' ? msg.senderType === 'member' : msg.senderType === 'staff'
}

function MessageBody({
  msg,
  isOwn,
}: {
  msg: ServiceChatMessage
  isOwn: boolean
}) {
  if (msg.isDeleted) {
    return (
      <p className={cn('text-sm italic', isOwn ? 'text-white/80' : 'text-[#969799]')}>
        ข้อความถูกยกเลิก
      </p>
    )
  }

  return (
    <>
      {msg.msgType === 'image' && msg.attachmentUrl && (
        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={msg.attachmentUrl}
            alt={msg.attachmentName ?? 'รูปภาพ'}
            className="mb-2 max-h-52 max-w-full rounded-lg object-contain"
          />
        </a>
      )}
      {msg.msgType === 'file' && msg.attachmentUrl && (
        <a
          href={msg.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={msg.attachmentName}
          className={cn(
            'mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm underline-offset-2 hover:underline',
            isOwn ? 'bg-white/15 text-white' : 'bg-[#f5f7fb] text-[#427ffa]',
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{msg.attachmentName ?? 'ไฟล์แนบ'}</span>
        </a>
      )}
      {msg.content.trim() && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
      )}
    </>
  )
}

export function ServiceChatMessageList({
  messages,
  mode,
  formatTime,
  bottomRef,
  onRecall,
  recallingId,
}: ServiceChatMessageListProps) {
  return (
    <>
      {messages.map((msg) => {
        const isSystem = msg.senderType === 'system'
        const isOwn =
          mode === 'member' ? msg.senderType === 'member' : msg.senderType === 'staff'

        if (isSystem) {
          return (
            <div key={msg.id} className="mb-3 flex justify-center">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-[#969799] shadow-sm ring-1 ring-black/5">
                {msg.content}
              </span>
            </div>
          )
        }

        const showRecall = onRecall && canRecall(msg, mode)

        return (
          <div
            key={msg.id}
            className={cn('group mb-3 flex', isOwn ? 'justify-end' : 'justify-start')}
          >
            <div className="relative max-w-[82%]">
              <div
                className={cn(
                  'rounded-2xl px-3.5 py-2.5 shadow-sm',
                  isOwn
                    ? 'rounded-br-md bg-[#427ffa] text-white'
                    : 'rounded-bl-md bg-white text-[#2c3345] ring-1 ring-black/5',
                )}
              >
                {!isOwn && (
                  <p className="mb-1 text-[11px] font-semibold text-[#427ffa]">
                    {msg.senderName ?? (mode === 'staff' ? 'สมาชิก' : 'เจ้าหน้าที่')}
                  </p>
                )}
                <MessageBody msg={msg} isOwn={isOwn} />
                <p
                  className={cn(
                    'mt-1 text-[10px]',
                    isOwn ? 'text-white/75' : 'text-[#969799]',
                  )}
                >
                  {formatTime(msg.createtime)}
                </p>
              </div>
              {showRecall && (
                <button
                  type="button"
                  disabled={recallingId === msg.id}
                  onClick={() => onRecall(msg.id)}
                  className={cn(
                    'absolute -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#969799] shadow ring-1 ring-black/10 transition hover:text-[#ee0a24]',
                    isOwn ? '-left-2' : '-right-2',
                    'opacity-100 md:opacity-0 md:group-hover:opacity-100',
                  )}
                  aria-label="ยกเลิกข้อความ"
                  title="ยกเลิกข้อความ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      })}
      {bottomRef && <div ref={bottomRef} />}
    </>
  )
}
