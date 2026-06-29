import { useEffect, useState } from 'react'
import { PageNavBar } from '@/components/common/PageNavBar'
import { adminListMembers, adminManualDeposit } from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import type { AdminMember } from '@/types'

interface AdminChongZhiPageProps {
  onBack: () => void
}

export function AdminChongZhiPage({ onBack }: AdminChongZhiPageProps) {
  const { user, refreshUser } = useAuth()
  const [members, setMembers] = useState<AdminMember[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    adminListMembers(1)
      .then((res) => setMembers(res.data))
      .catch(() => setMembers([]))
  }, [])

  const handleSubmit = async () => {
    const amt = Number(amount)
    if (!selectedId || amt <= 0) {
      alert('กรุณาเลือกสมาชิกและกรอกจำนวนเงิน')
      return
    }
    setSubmitting(true)
    try {
      await adminManualDeposit(Number(selectedId), amt, note || undefined)
      alert('เติมเงินสำเร็จ')
      setAmount('')
      setNote('')
      await refreshUser()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'เติมเงินไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5] pb-8">
      <PageNavBar title="เติมเงินให้สมาชิก" showBack onBack={onBack} />

      <div className="mx-2.5 mt-3 space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="rounded-lg bg-[#427ffa] p-4 text-center text-white">
          <p className="text-sm opacity-90">ยอดเงินของคุณ (ผู้ดูแล)</p>
          <h2 className="text-2xl font-bold">{user?.balance.toLocaleString() ?? '0'} ฿</h2>
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#333]">เลือกสมาชิก</h3>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
          >
            <option value="">— เลือกสมาชิก —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.username} ({m.money.toLocaleString()} ฿)
              </option>
            ))}
          </select>
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
          disabled={submitting}
          onClick={() => void handleSubmit()}
          className="w-full rounded-lg bg-[#148164] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันเติมเงิน'}
        </button>
      </div>
    </div>
  )
}
