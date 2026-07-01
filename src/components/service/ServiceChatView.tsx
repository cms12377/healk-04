import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_NAME } from '@/constants/branding'
import { ASSETS } from '@/constants/assets'
import { ServiceChatComposer } from '@/components/service/ServiceChatComposer'
import { ServiceChatMessageList } from '@/components/service/ServiceChatMessageList'
import { useAuth } from '@/context/AuthContext'
import { getOrCreateGuestKey } from '@/lib/serviceGuestKey'
import type { ServiceChatUploadedAttachment } from '@/lib/serviceChatAttachment'
import {
  maxMessageUpdateTime,
  mergeServiceChatMessages,
  openServiceChat,
  pollServiceChatMessages,
  recallServiceChatMessage,
  sendServiceChatMessage,
} from '@/services/serviceChat'
import type { ServiceChatMessage } from '@/types'
import { cn } from '@/lib/utils'

const POLL_MS = 3000

function formatTime(ts: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ServiceChatView({ className }: { className?: string }) {
  const { isLoggedIn, user } = useAuth()
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ServiceChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [recallingId, setRecallingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef(0)
  const updatesSinceRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const syncRefs = useCallback((list: ServiceChatMessage[]) => {
    lastIdRef.current = list.at(-1)?.id ?? 0
    updatesSinceRef.current = maxMessageUpdateTime(list)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void openServiceChat()
      .then((res) => {
        if (cancelled) return
        setConversationId(res.conversationId)
        setMessages(res.messages)
        syncRefs(res.messages)
        requestAnimationFrame(scrollToBottom)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดแชทไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, scrollToBottom, syncRefs])

  useEffect(() => {
    if (!conversationId) return
    const timer = window.setInterval(() => {
      void pollServiceChatMessages(
        conversationId,
        lastIdRef.current,
        updatesSinceRef.current,
      )
        .then(({ messages: incoming, updates }) => {
          if (incoming.length === 0 && updates.length === 0) return
          setMessages((prev) => {
            const merged = mergeServiceChatMessages(prev, incoming, updates)
            syncRefs(merged)
            return merged
          })
          requestAnimationFrame(scrollToBottom)
        })
        .catch(() => null)
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [conversationId, scrollToBottom, syncRefs])

  const handleSend = async ({
    content,
    attachment,
  }: {
    content: string
    attachment?: ServiceChatUploadedAttachment
  }) => {
    setSending(true)
    setError('')
    try {
      const msg = await sendServiceChatMessage(
        attachment
          ? {
              content,
              msgType: attachment.kind,
              attachmentUrl: attachment.url,
              attachmentName: attachment.name,
              attachmentMime: attachment.mime,
            }
          : content,
      )
      setMessages((prev) => {
        const merged = mergeServiceChatMessages(prev, [{ ...msg, senderName: 'คุณ' }])
        syncRefs(merged)
        return merged
      })
      requestAnimationFrame(scrollToBottom)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งข้อความไม่สำเร็จ')
      throw e
    } finally {
      setSending(false)
    }
  }

  const handleRecall = async (messageId: number) => {
    if (!window.confirm('ยกเลิกข้อความนี้?')) return
    setRecallingId(messageId)
    setError('')
    try {
      await recallServiceChatMessage(messageId)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: '', updatetime: Math.floor(Date.now() / 1000) }
            : m,
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ยกเลิกข้อความไม่สำเร็จ')
    } finally {
      setRecallingId(null)
    }
  }

  const uploadRole = isLoggedIn ? 'member' : 'guest'
  const actorId = isLoggedIn ? user?.id : getOrCreateGuestKey()

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-[#eef1f6]', className)}>
      <div className="flex items-center gap-3 border-b border-[#e3e6ee] bg-white px-4 py-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#427ffa]">
          <img src={ASSETS.serviceIcon} alt="" className="h-8 w-8 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[#2c3345]">{APP_NAME}</p>
          <p className="text-sm text-[#969799]">ยินดีให้บริการ 24 ชั่วโมง</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {loading && (
          <p className="py-8 text-center text-sm text-[#969799]">กำลังเชื่อมต่อแชท...</p>
        )}
        {!loading && (
          <ServiceChatMessageList
            messages={messages}
            mode="member"
            formatTime={formatTime}
            bottomRef={bottomRef}
            onRecall={(id) => void handleRecall(id)}
            recallingId={recallingId}
          />
        )}
      </div>

      <ServiceChatComposer
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        sending={sending}
        uploading={false}
        uploadRole={uploadRole}
        actorId={actorId}
        error={error}
      />
    </div>
  )
}
