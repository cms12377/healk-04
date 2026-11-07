import { getOrCreateGuestKey } from '@/lib/serviceGuestKey'
import { requireSupabase } from '@/lib/supabase'
import type { ServiceChatMessage, ServiceMessageType } from '@/types'

export function mapServiceChatMessage(row: Record<string, unknown>): ServiceChatMessage {
  return {
    id: Number(row.id),
    senderType: String(row.sender_type) as ServiceChatMessage['senderType'],
    msgType: (String(row.msg_type ?? 'text') as ServiceMessageType) || 'text',
    content: String(row.content ?? ''),
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : undefined,
    attachmentName: row.attachment_name ? String(row.attachment_name) : undefined,
    attachmentMime: row.attachment_mime ? String(row.attachment_mime) : undefined,
    isDeleted: Boolean(row.is_deleted),
    createtime: Number(row.createtime ?? 0),
    updatetime: Number(row.updatetime ?? row.createtime ?? 0),
    senderName: row.sender_name ? String(row.sender_name) : undefined,
  }
}

export function mergeServiceChatMessages(
  prev: ServiceChatMessage[],
  incoming: ServiceChatMessage[],
  updates: ServiceChatMessage[] = [],
): ServiceChatMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]))
  for (const msg of [...incoming, ...updates]) {
    byId.set(msg.id, msg)
  }
  return Array.from(byId.values()).sort((a, b) => a.id - b.id)
}

export function maxMessageUpdateTime(messages: ServiceChatMessage[]): number {
  return messages.reduce((max, m) => Math.max(max, m.updatetime ?? m.createtime), 0)
}

export interface SendServiceChatInput {
  content?: string
  msgType?: ServiceMessageType
  attachmentUrl?: string
  attachmentName?: string
  attachmentMime?: string
}

export async function openServiceChat(guestKey?: string): Promise<{
  conversationId: number
  messages: ServiceChatMessage[]
}> {
  const client = requireSupabase()
  const key = guestKey ?? getOrCreateGuestKey()
  const { data, error } = await client.rpc('service_open_chat', { p_guest_key: key })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    conversationId: Number(row.conversation_id),
    messages: ((row.messages as Record<string, unknown>[]) ?? []).map(mapServiceChatMessage),
  }
}

export async function sendServiceChatMessage(
  input: SendServiceChatInput | string,
  guestKey?: string,
): Promise<ServiceChatMessage> {
  const client = requireSupabase()
  const key = guestKey ?? getOrCreateGuestKey()
  const payload = typeof input === 'string' ? { content: input } : input
  const { data, error } = await client.rpc('service_send_chat_message', {
    p_content: payload.content ?? '',
    p_guest_key: key,
    p_msg_type: payload.msgType ?? 'text',
    p_attachment_url: payload.attachmentUrl ?? null,
    p_attachment_name: payload.attachmentName ?? null,
    p_attachment_mime: payload.attachmentMime ?? null,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return mapServiceChatMessage({ ...row, sender_type: 'member' })
}

export async function recallServiceChatMessage(
  messageId: number,
  guestKey?: string,
): Promise<void> {
  const client = requireSupabase()
  const key = guestKey ?? getOrCreateGuestKey()
  const { error } = await client.rpc('service_recall_chat_message', {
    p_message_id: messageId,
    p_guest_key: key,
  })
  if (error) throw new Error(error.message)
}

export async function pollServiceChatMessages(
  conversationId: number,
  afterId: number,
  updatesSince: number,
  guestKey?: string,
): Promise<{ messages: ServiceChatMessage[]; updates: ServiceChatMessage[] }> {
  const client = requireSupabase()
  const key = guestKey ?? getOrCreateGuestKey()
  const { data, error } = await client.rpc('service_poll_chat_messages', {
    p_conversation_id: conversationId,
    p_guest_key: key,
    p_after_id: afterId,
    p_updates_since: updatesSince,
  })
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    messages: ((row.messages as Record<string, unknown>[]) ?? []).map(mapServiceChatMessage),
    updates: ((row.updates as Record<string, unknown>[]) ?? []).map(mapServiceChatMessage),
  }
}
