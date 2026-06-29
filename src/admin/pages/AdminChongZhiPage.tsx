import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { adminFetchAllMembers, adminManualDeposit } from '@/services/admin'
import type { AdminMember } from '@/types'

interface AdminChongZhiPageProps {
  onBack: () => void
}

export function AdminChongZhiPage({ onBack }: AdminChongZhiPageProps) {
  const [members, setMembers] = useState<AdminMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [memberError, setMemberError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true)
    setMemberError('')
    try {
      const list = await adminFetchAllMembers()
      setMembers(list)
    } catch (e) {
      setMemberError(e instanceof Error ? e.message : 'โหลดรายชื่อสมาชิกไม่สำเร็จ')
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.nickname.toLowerCase().includes(q),
    )
  }, [members, search])

  const selectedMember = members.find((m) => m.id === selectedId)

  const handleSubmit = async () => {
    const amt = Number(amount)
    if (!selectedId || amt <= 0) {
      alert('กรุณาเลือกสมาชิกและกรอกจำนวนเงิน')
      return
    }
    if (
      !window.confirm(
        `ยืนยันเติมเงิน ${amt.toLocaleString()} ฿ ให้ ${selectedMember?.username ?? 'สมาชิก'}?`,
      )
    ) {
      return
    }
    setSubmitting(true)
    try {
      await adminManualDeposit(Number(selectedId), amt, note || undefined)
      alert('เติมเงินสำเร็จ')
      setAmount('')
      setNote('')
      await loadMembers()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'เติมเงินไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5] pb-8 pt-[60px]">
      <div className="fixed top-0 z-[1000] w-full">
        <PageNavBar title="เติมเงิน" showBack onBack={onBack} />
      </div>

      <div className="mx-2.5 mt-3 space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="rounded-lg bg-linear-to-br from-[#148164] to-[#1abc9c] p-4 text-center text-white">
          <p className="text-sm opacity-90">เติมเงินให้สมาชิก (Manual)</p>
          <p className="mt-1 text-xs opacity-80">อนุมัติและเพิ่มยอดทันที</p>
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#333]">ค้นหาสมาชิก</h3>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="พิมพ์ชื่อผู้ใช้..."
            className="mb-2 w-full rounded border border-[#ddd] px-3 py-2 text-sm outline-none focus:border-[#148164]"
          />
          {loadingMembers && (
            <p className="text-center text-sm text-[#888]">กำลังโหลดสมาชิก...</p>
          )}
          {memberError && (
            <p className="text-center text-sm text-[#ee0a24]">
              {memberError}
              <button type="button" onClick={() => void loadMembers()} className="ml-1 text-[#427ffa]">
                ลองใหม่
              </button>
            </p>
          )}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
            disabled={loadingMembers}
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
          >
            <option value="">— เลือกสมาชิก —</option>
            {filtered.map((m) => (
              <option key={m.id} value={m.id}>
                {m.username} ({m.money.toLocaleString()} ฿)
              </option>
            ))}
          </select>
          {selectedMember && (
            <p className="mt-1 text-xs text-[#888]">
              ยอดปัจจุบัน: {selectedMember.money.toLocaleString()} ฿
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#333]">จำนวนเงิน</h3>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="กรอกจำนวนเงิน"
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#333]">หมายเหตุ (ไม่บังคับ)</h3>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ"
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
          />
        </section>

        <button
          type="button"
          disabled={submitting || loadingMembers}
          onClick={() => void handleSubmit()}
          className="h-[42px] w-full rounded-full bg-[#5f97ff] text-sm font-semibold text-white shadow-[inset_0_2px_#4e86ff] disabled:opacity-60"
        >
          {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันเติมเงิน'}
        </button>
      </div>
    </div>
  )
}
