import { useCallback, useEffect, useRef, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { ServiceChatComposer } from '@/components/service/ServiceChatComposer'
import { ServiceChatMessageList } from '@/components/service/ServiceChatMessageList'
import {
  adminGetServiceChatThread,
  adminListServiceChats,
  adminRecallServiceChatMessage,
  adminReplyServiceChat,
} from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import type { ServiceChatUploadedAttachment } from '@/lib/serviceChatAttachment'
import type { AdminServiceConversation, ServiceChatMessage } from '@/types'
import { cn } from '@/lib/utils'

interface AdminServiceChatPageProps {
  onBack: () => void
}

function formatTime(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminServiceChatPage({ onBack }: AdminServiceChatPageProps) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<AdminServiceConversation[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ServiceChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [recallingId, setRecallingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const list = await adminListServiceChats()
      setConversations(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดรายการแชทไม่สำเร็จ')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadThread = useCallback(async (id: number) => {
    setLoadingThread(true)
    setError('')
    try {
      const { messages: msgs } = await adminGetServiceChatThread(id)
      setMessages(msgs)
      await loadList()
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อความไม่สำเร็จ')
    } finally {
      setLoadingThread(false)
    }
  }, [loadList])

  useEffect(() => {
    void loadList()
    const timer = window.setInterval(() => {
      void loadList()
      if (selectedId) void loadThread(selectedId)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [loadList, loadThread, selectedId])

  const openChat = (id: number) => {
    setSelectedId(id)
    void loadThread(id)
  }

  const handleSend = async ({
    content,
    attachment,
  }: {
    content: string
    attachment?: ServiceChatUploadedAttachment
  }) => {
    if (!selectedId) return
    setSending(true)
    setError('')
    try {
      const msg = await adminReplyServiceChat(
        selectedId,
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
      setDraft('')
      setMessages((prev) => [...prev, { ...msg, senderName: 'เจ้าหน้าที่' }])
      await loadList()
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
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
      await adminRecallServiceChatMessage(messageId)
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

  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <AdminPageLayout title="แชทบริการ" showBack onBack={onBack}>
      <div className="flex min-h-[calc(100dvh-56px)] flex-col md:flex-row">
        <aside
          className={cn(
            'border-b border-[#eee] bg-white md:w-[320px] md:border-b-0 md:border-r',
            selectedId ? 'hidden md:block' : 'block',
          )}
        >
          <div className="border-b border-[#eee] px-4 py-3">
            <p className={AD.label}>รายการสนทนา</p>
            <p className={cn('mt-1', AD.hint)}>{conversations.length} รายการ</p>
          </div>
          {loadingList && conversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-[#888]">กำลังโหลด...</p>
          ) : (
            <ul className="max-h-[50dvh] overflow-y-auto md:max-h-[calc(100dvh-120px)]">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openChat(c.id)}
                    className={cn(
                      'w-full border-b border-[#f0f0f0] px-4 py-3 text-left transition hover:bg-[#f8faff]',
                      selectedId === c.id && 'bg-[#eef2ff]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#2c3345]">{c.displayName}</p>
                      {c.unreadStaff > 0 && (
                        <span className="rounded-full bg-[#ee0a24] px-2 py-0.5 text-[10px] font-bold text-white">
                          {c.unreadStaff}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-[#969799]">
                      {c.lastPreview || '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#bbb]">{formatTime(c.lastMessageAt)}</p>
                  </button>
                </li>
              ))}
              {conversations.length === 0 && (
                <li className="p-8 text-center text-sm text-[#888]">ยังไม่มีข้อความจากสมาชิก</li>
              )}
            </ul>
          )}
        </aside>

        <section className={cn('flex min-h-0 flex-1 flex-col bg-[#eef1f6]', !selectedId && 'hidden md:flex')}>
          {!selectedId ? (
            <div className="grid flex-1 place-items-center text-[#969799]">
              เลือกสนทนาเพื่อตอบกลับ
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-[#e3e6ee] bg-white px-4 py-3">
                <button
                  type="button"
                  className="mr-1 text-sm text-[#427ffa] md:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  ← รายการ
                </button>
                <div>
                  <p className="font-semibold text-[#2c3345]">{selected?.displayName}</p>
                  <p className="text-xs text-[#969799]">
                    {selected?.username ? `@${selected.username}` : 'ผู้เยี่ยมชม'}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                {loadingThread && messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-[#969799]">กำลังโหลด...</p>
                )}
                <ServiceChatMessageList
                  messages={messages}
                  mode="staff"
                  formatTime={formatTime}
                  bottomRef={bottomRef}
                  onRecall={(id) => void handleRecall(id)}
                  recallingId={recallingId}
                />
              </div>

              <ServiceChatComposer
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleSend}
                sending={sending}
                uploading={false}
                placeholder="ตอบกลับสมาชิก..."
                uploadRole="staff"
                actorId={user?.id}
                error={error}
              />
            </>
          )}
        </section>
      </div>
    </AdminPageLayout>
  )
}
