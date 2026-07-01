import { Building2, Bitcoin, ImagePlus, Plus, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { TabBar } from '@/components/common/PageNavBar'
import {
  adminListRechargeChannels,
  adminSaveRechargeChannel,
  type AdminSaveRechargeChannelInput,
} from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { resolveDepositQrcodeSrc, uploadRechargeQrcode } from '@/lib/rechargeQrcode'
import { cn } from '@/lib/utils'
import type { AdminRechargeChannel } from '@/types'

interface AdminDepositAccountsPageProps {
  onBack: () => void
}

const EMPTY_BANK: AdminSaveRechargeChannelInput = {
  type: 'bank',
  name: 'ฝากมาตรฐาน',
  bankName: '',
  bankUsername: '',
  bankCard: '',
  notice: '',
  quickAmounts: ['100', '500', '1000', '5000', '10000', '50000'],
  sort: 1,
  status: 1,
}

const EMPTY_CRYPTO: AdminSaveRechargeChannelInput = {
  type: 'crypto',
  name: 'ฝากคริปโต',
  address: '',
  notice: '',
  quickAmounts: ['100', '500', '1000', '5000', '10000', '20000'],
  sort: 2,
  status: 1,
}

function amountsToText(amounts: string[]): string {
  return amounts.join(', ')
}

function textToAmounts(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter((s) => s && /^\d+$/.test(s))
}

function QrcodePreview({
  qrcode,
  fallback,
  label,
}: {
  qrcode?: string
  fallback: string
  label: string
}) {
  const src = resolveDepositQrcodeSrc(qrcode, fallback, 120)
  if (!src) return null
  return (
    <div className="mt-3 flex items-start gap-3">
      <img
        src={src}
        alt={label}
        className="h-[120px] w-[120px] shrink-0 rounded-lg border border-[#eee] bg-white p-1.5 object-contain"
      />
      <div className="min-w-0 text-sm">
        <p className={AD.label}>{label}</p>
        <p className={cn('mt-1', AD.hint)}>
          {qrcode ? 'ใช้รูปที่อัปโหลด/URL' : 'สมาชิกจะเห็น QR สร้างอัตโนมัติ'}
        </p>
      </div>
    </div>
  )
}

export function AdminDepositAccountsPage({ onBack }: AdminDepositAccountsPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [tab, setTab] = useState<'bank' | 'crypto'>('bank')
  const [channels, setChannels] = useState<AdminRechargeChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<AdminSaveRechargeChannelInput>(EMPTY_BANK)
  const [amountsText, setAmountsText] = useState(amountsToText(EMPTY_BANK.quickAmounts))
  const [uploadingQr, setUploadingQr] = useState(false)
  const qrFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setChannels(await adminListRechargeChannels())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดบัญชีฝากไม่สำเร็จ')
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => channels.filter((c) => c.type === tab).sort((a, b) => a.sort - b.sort || a.id - b.id),
    [channels, tab],
  )

  const startNew = () => {
    const base = tab === 'bank' ? EMPTY_BANK : EMPTY_CRYPTO
    setForm({ ...base, sort: filtered.length + 1 })
    setAmountsText(amountsToText(base.quickAmounts))
    setEditingId('new')
  }

  const startEdit = (ch: AdminRechargeChannel) => {
    setForm({
      id: ch.id,
      type: ch.type,
      name: ch.name,
      bankName: ch.bankName,
      bankUsername: ch.bankUsername,
      bankCard: ch.bankCard,
      address: ch.address,
      qrcode: ch.type === 'crypto' ? ch.qrcode : undefined,
      notice: ch.notice,
      quickAmounts: ch.quickAmounts,
      sort: ch.sort,
      status: ch.status === 1 ? 1 : 0,
    })
    setAmountsText(amountsToText(ch.quickAmounts))
    setEditingId(ch.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleQrUpload = async (file: File) => {
    if (!isAdmin) return
    setUploadingQr(true)
    try {
      const channelId = typeof editingId === 'number' ? editingId : undefined
      const url = await uploadRechargeQrcode(file, channelId)
      setForm((f) => ({ ...f, qrcode: url }))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploadingQr(false)
      if (qrFileRef.current) qrFileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!isAdmin) {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้')
      return
    }
    const quickAmounts = textToAmounts(amountsText)
    if (!form.name.trim()) {
      alert('กรุณากรอกชื่อช่องทาง')
      return
    }
    if (form.type === 'bank' && !form.bankCard?.trim()) {
      alert('กรุณากรอกเลขบัญชี')
      return
    }
    if (form.type === 'crypto' && !form.address?.trim()) {
      alert('กรุณากรอกที่อยู่กระเป๋า')
      return
    }
    if (quickAmounts.length === 0) {
      alert('กรุณากรอกจำนวนเงินด่วนอย่างน้อย 1 รายการ')
      return
    }

    setSaving(true)
    try {
      await adminSaveRechargeChannel({
        ...form,
        type: tab,
        quickAmounts,
        qrcode: tab === 'crypto' ? form.qrcode : '',
      })
      setEditingId(null)
      await load()
      alert('บันทึกสำเร็จ — สมาชิกจะเห็นทันทีในหน้าฝากเงิน')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (ch: AdminRechargeChannel) => {
    if (!isAdmin) return
    const next = ch.status === 1 ? 0 : 1
    const label = next === 1 ? 'เปิด' : 'ปิด'
    if (!window.confirm(`${label}ช่องทาง "${ch.name}"?`)) return
    setSaving(true)
    try {
      await adminSaveRechargeChannel({
        id: ch.id,
        type: ch.type,
        name: ch.name,
        bankName: ch.bankName,
        bankUsername: ch.bankUsername,
        bankCard: ch.bankCard,
        address: ch.address,
        qrcode: ch.qrcode,
        notice: ch.notice,
        quickAmounts: ch.quickAmounts,
        sort: ch.sort,
        status: next as 0 | 1,
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageLayout title="จัดการบัญชี" showBack onBack={onBack}>
      <div className="bg-white px-3 py-3 ring-1 ring-black/5">
        <TabBar
          tabs={[
            { value: 'bank', label: 'ฝากมาตรฐาน' },
            { value: 'crypto', label: 'ฝากคริปโต' },
          ]}
          active={tab}
          onChange={(v) => {
            setTab(v as 'bank' | 'crypto')
            setEditingId(null)
          }}
          variant="pill"
        />
      </div>

      <div className={cn(AD.pagePad, AD.stack)}>
        <p className={cn(AD.bannerSm, 'bg-[#eef2ff] text-[#4e72f3]')}>
          {tab === 'bank'
            ? 'บัญชีที่สมาชิกเห็นใน ฝากเงิน → โอนเข้าบัญชี (ฝากมาตรฐาน)'
            : 'ที่อยู่ที่สมาชิกเห็นใน ฝากเงิน → ฝากคริปโต'}
        </p>
        {isAdmin && tab === 'crypto' && (
          <p className={cn(AD.bannerSm, 'bg-[#fff8e1] text-[#5d4037]')}>
            อัปโหลด QR ครั้งแรก: รัน{' '}
            <code className="rounded bg-white/70 px-1 text-xs">fix_recharge_qrcode_storage.sql</code>{' '}
            ใน Supabase ก่อน (ครั้งเดียว)
          </p>
        )}

        {!isAdmin && (
          <p className={cn(AD.bannerSm, 'bg-[#fff8e1] text-[#f57c00]')}>
            ตัวแทนดูได้อย่างเดียว — แก้ไขได้เฉพาะผู้ดูแลระบบ
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-base text-[#888]">กำลังโหลด...</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((ch) => (
              <li key={ch.id} className={cn(AD.card, editingId === ch.id && 'ring-2 ring-[#4e72f3]')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {ch.type === 'bank' ? (
                        <Building2 className="h-5 w-5 shrink-0 text-[#2e7d32]" />
                      ) : (
                        <Bitcoin className="h-5 w-5 shrink-0 text-[#e65100]" />
                      )}
                      <span className={AD.titleMd}>{ch.name}</span>
                      <span
                        className={cn(
                          AD.badge,
                          ch.status === 1 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]',
                        )}
                      >
                        {ch.status === 1 ? 'เปิด' : 'ปิด'}
                      </span>
                    </div>
                    {ch.type === 'bank' ? (
                      <dl className="mt-3 space-y-1.5 text-base">
                        <div className="flex justify-between gap-2">
                          <dt className={AD.label}>ธนาคาร</dt>
                          <dd className={AD.value}>{ch.bankName || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className={AD.label}>ชื่อบัญชี</dt>
                          <dd className={AD.value}>{ch.bankUsername || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className={AD.label}>เลขบัญชี</dt>
                          <dd className="font-mono font-semibold text-[#4e72f3]">
                            {ch.bankCard || '—'}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <dl className="mt-3 space-y-1.5 text-base">
                        <div>
                          <dt className={AD.label}>ที่อยู่</dt>
                          <dd className="mt-1 break-all font-mono text-sm text-[#333]">
                            {ch.address || '—'}
                          </dd>
                        </div>
                      </dl>
                    )}
                    {ch.type === 'crypto' && (
                      <QrcodePreview
                        qrcode={ch.qrcode}
                        fallback={ch.address ?? ''}
                        label="QR ที่สมาชิกเห็น"
                      />
                    )}
                    {ch.notice && (
                      <p className={cn('mt-2', AD.body)}>{ch.notice}</p>
                    )}
                    <p className={cn('mt-2', AD.hint)}>
                      จำนวนด่วน: {ch.quickAmounts.join(' · ')}
                    </p>
                  </div>
                  {isAdmin && editingId !== ch.id && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867]')}
                        onClick={() => startEdit(ch)}
                      >
                        <Pencil className="mr-1 inline h-4 w-4" />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867]')}
                        onClick={() => void toggleStatus(ch)}
                        disabled={saving}
                      >
                        {ch.status === 1 ? 'ปิด' : 'เปิด'}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {filtered.length === 0 && editingId !== 'new' && (
              <p className="py-8 text-center text-base text-[#888]">
                ยังไม่มี{tab === 'bank' ? 'บัญชีธนาคาร' : 'ช่องทางคริปโต'}
              </p>
            )}
          </ul>
        )}

        {isAdmin && editingId === null && (
          <button
            type="button"
            onClick={startNew}
            className={cn(
              AD.btn,
              'flex items-center justify-center gap-2 border-2 border-dashed border-[#4e72f3]/40 bg-white text-[#4e72f3]',
            )}
          >
            <Plus className="h-5 w-5" />
            เพิ่ม{tab === 'bank' ? 'บัญชีธนาคาร' : 'ช่องทางคริปโต'}
          </button>
        )}

        {isAdmin && editingId !== null && (
          <section className={cn(AD.card, 'space-y-4')}>
            <h3 className={AD.titleMd}>
              {editingId === 'new'
                ? tab === 'bank'
                  ? 'เพิ่มบัญชีธนาคาร'
                  : 'เพิ่มช่องทางคริปโต'
                : tab === 'bank'
                  ? 'แก้ไขบัญชีธนาคาร'
                  : 'แก้ไขช่องทางคริปโต'}
            </h3>

            <label className="block">
              <span className={AD.label}>ชื่อที่สมาชิกเห็น</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={cn(AD.input, 'mt-1.5')}
                placeholder={tab === 'bank' ? 'ฝากมาตรฐาน' : 'ฝากคริปโต'}
              />
            </label>

            {tab === 'bank' ? (
              <>
                <label className="block">
                  <span className={AD.label}>ธนาคาร</span>
                  <input
                    type="text"
                    value={form.bankName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                    placeholder="ธนาคารกสิกรไทย"
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>ชื่อบัญชี</span>
                  <input
                    type="text"
                    value={form.bankUsername ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, bankUsername: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>เลขบัญชี</span>
                  <input
                    type="text"
                    value={form.bankCard ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, bankCard: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5 font-mono')}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className={AD.label}>ที่อยู่กระเป๋า (USDT TRC20 ฯลฯ)</span>
                  <textarea
                    value={form.address ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    rows={2}
                    className={cn(AD.textarea, 'mt-1.5 font-mono text-sm')}
                  />
                </label>
              </>
            )}

            {tab === 'crypto' && (
              <div className="rounded-xl bg-[#f8f9fa] px-3 py-3 ring-1 ring-black/5">
                <span className={AD.label}>QR Code คริปโต</span>
                <p className={cn('mt-1', AD.hint)}>
                  อัปโหลดรูป QR หรือวาง URL — ถ้าไม่ตั้ง สมาชิกจะเห็น QR สร้างอัตโนมัติจากที่อยู่กระเป๋า
                </p>

                <QrcodePreview
                  qrcode={form.qrcode}
                  fallback={form.address ?? ''}
                  label="ตัวอย่าง"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    ref={qrFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleQrUpload(file)
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingQr || saving}
                    onClick={() => qrFileRef.current?.click()}
                    className={cn(
                      AD.btnAction,
                      'inline-flex items-center gap-1.5 border border-[#4e72f3] text-[#4e72f3]',
                    )}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploadingQr ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป QR'}
                  </button>
                  {form.qrcode && (
                    <button
                      type="button"
                      disabled={uploadingQr || saving}
                      onClick={() => setForm((f) => ({ ...f, qrcode: '' }))}
                      className={cn(
                        AD.btnAction,
                        'inline-flex items-center gap-1.5 border border-[#ddd] text-[#666]',
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                      ล้าง QR
                    </button>
                  )}
                </div>

                <label className="mt-3 block">
                  <span className={AD.label}>หรือวาง URL รูป QR</span>
                  <input
                    type="url"
                    value={form.qrcode ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, qrcode: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                    placeholder="https://..."
                  />
                </label>
              </div>
            )}

            <label className="block">
              <span className={AD.label}>หมายเหตุถึงสมาชิก</span>
              <textarea
                value={form.notice ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notice: e.target.value }))}
                rows={2}
                className={cn(AD.textarea, 'mt-1.5')}
              />
            </label>

            <label className="block">
              <span className={AD.label}>จำนวนเงินด่วน (คั่นด้วย comma)</span>
              <input
                type="text"
                value={amountsText}
                onChange={(e) => setAmountsText(e.target.value)}
                className={cn(AD.input, 'mt-1.5')}
                placeholder="100, 500, 1000, 5000"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={AD.label}>ลำดับแสดง</span>
                <input
                  type="number"
                  min={0}
                  value={form.sort}
                  onChange={(e) => setForm((f) => ({ ...f, sort: Number(e.target.value) }))}
                  className={cn(AD.input, 'mt-1.5')}
                />
              </label>
              <label className="block">
                <span className={AD.label}>สถานะ</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: Number(e.target.value) as 0 | 1 }))
                  }
                  className={cn(AD.select, 'mt-1.5')}
                >
                  <option value={1}>เปิด — สมาชิกเห็น</option>
                  <option value={0}>ปิด — ซ่อน</option>
                </select>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className={cn(AD.btnAction, 'flex-1 border border-[#ddd] text-[#666]')}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className={cn(AD.btnAction, 'flex-1 bg-[#4e72f3] text-white disabled:opacity-60')}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </section>
        )}
      </div>
    </AdminPageLayout>
  )
}
