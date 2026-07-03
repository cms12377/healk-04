import { Gift, Mail, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminBadge } from '@/admin/components/AdminBadge'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { TabBar } from '@/components/common/PageNavBar'
import {
  adminDeleteActivity,
  adminDeleteUserNotice,
  adminDeleteVipTier,
  adminListActivities,
  adminListUserNotices,
  adminListVipTiers,
  adminSaveActivity,
  adminSaveUserNotice,
  adminSaveVipTier,
  type AdminSaveActivityInput,
  type AdminSaveUserNoticeInput,
  type AdminSaveVipTierInput,
} from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { formatTimestamp } from '@/services/wallet'
import { cn } from '@/lib/utils'
import type { ActivityCategory, AdminActivity, AdminUserNotice, AdminVipTierRow } from '@/types'

interface AdminBonusPageProps {
  onBack: () => void
}

type BonusTab = 'promotions' | 'vip' | 'messages'

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  68: 'โปรโมชั่นหวย',
  69: 'โปรโมชั่นอื่นๆ',
}

const EMPTY_ACTIVITY: AdminSaveActivityInput = {
  categoryId: 68,
  title: '',
  text: '',
  images: '',
  sort: 1,
  status: 1,
}

const EMPTY_VIP: AdminSaveVipTierInput = {
  level: 1,
  image: '',
  depositRequired: 0,
  sort: 1,
}

const EMPTY_NOTICE: AdminSaveUserNoticeInput = {
  scope: 'broadcast',
  title: '',
  content: '<p></p>',
}

export function AdminBonusPage({ onBack }: AdminBonusPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [tab, setTab] = useState<BonusTab>('promotions')
  const [promoCategory, setPromoCategory] = useState<ActivityCategory>(68)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [vipTiers, setVipTiers] = useState<AdminVipTierRow[]>([])
  const [notices, setNotices] = useState<AdminUserNotice[]>([])

  const [editingPromo, setEditingPromo] = useState<number | 'new' | null>(null)
  const [promoForm, setPromoForm] = useState<AdminSaveActivityInput>(EMPTY_ACTIVITY)

  const [editingVip, setEditingVip] = useState<number | 'new' | null>(null)
  const [vipForm, setVipForm] = useState<AdminSaveVipTierInput>(EMPTY_VIP)

  const [editingNotice, setEditingNotice] = useState<number | 'new' | null>(null)
  const [noticeForm, setNoticeForm] = useState<AdminSaveUserNoticeInput>(EMPTY_NOTICE)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'promotions') {
        setActivities(await adminListActivities())
      } else if (tab === 'vip') {
        setVipTiers(await adminListVipTiers())
      } else {
        setNotices(await adminListUserNotices())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  const filteredActivities = useMemo(
    () => activities.filter((a) => a.categoryId === promoCategory).sort((a, b) => a.sort - b.sort || a.id - b.id),
    [activities, promoCategory],
  )

  const startNewPromo = () => {
    setPromoForm({ ...EMPTY_ACTIVITY, categoryId: promoCategory, sort: filteredActivities.length + 1 })
    setEditingPromo('new')
  }

  const startEditPromo = (item: AdminActivity) => {
    setPromoForm({
      id: item.id,
      categoryId: item.categoryId,
      title: item.title,
      text: item.text,
      images: item.images,
      sort: item.sort,
      status: item.status === 1 ? 1 : 0,
    })
    setEditingPromo(item.id)
  }

  const startNewVip = () => {
    const nextLevel = vipTiers.length > 0 ? Math.max(...vipTiers.map((t) => t.level)) + 1 : 1
    setVipForm({ ...EMPTY_VIP, level: nextLevel, sort: vipTiers.length + 1 })
    setEditingVip('new')
  }

  const startEditVip = (item: AdminVipTierRow) => {
    setVipForm({
      level: item.level,
      image: item.image,
      depositRequired: item.depositRequired,
      sort: item.sort,
    })
    setEditingVip(item.level)
  }

  const startNewNotice = () => {
    setNoticeForm({ ...EMPTY_NOTICE })
    setEditingNotice('new')
  }

  const startEditNotice = (item: AdminUserNotice) => {
    setNoticeForm({
      id: item.id,
      scope: item.scope,
      userId: item.userId,
      title: item.title,
      content: item.content,
    })
    setEditingNotice(item.id)
  }

  const cancelEdit = () => {
    setEditingPromo(null)
    setEditingVip(null)
    setEditingNotice(null)
  }

  const handleSavePromo = async () => {
    if (!isAdmin) return
    if (!promoForm.title.trim()) {
      alert('กรุณากรอกหัวข้อ')
      return
    }
    setSaving(true)
    try {
      await adminSaveActivity(promoForm)
      setEditingPromo(null)
      await load()
      alert('บันทึกสำเร็จ — สมาชิกจะเห็นใน #/activity')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePromo = async (item: AdminActivity) => {
    if (!isAdmin) return
    if (!window.confirm(`ลบโปรโมชั่น "${item.title}"?`)) return
    setSaving(true)
    try {
      await adminDeleteActivity(item.id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveVip = async () => {
    if (!isAdmin) return
    if (vipForm.depositRequired < 0) {
      alert('ยอดฝากสะสมต้องไม่ติดลบ')
      return
    }
    setSaving(true)
    try {
      await adminSaveVipTier(vipForm)
      setEditingVip(null)
      await load()
      alert('บันทึกสำเร็จ — สมาชิกจะเห็นใน #/caijin')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVip = async (level: number) => {
    if (!isAdmin) return
    if (!window.confirm(`ลบ VIP ระดับ ${level}?`)) return
    setSaving(true)
    try {
      await adminDeleteVipTier(level)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotice = async () => {
    if (!isAdmin) return
    if (!noticeForm.title.trim()) {
      alert('กรุณากรอกหัวข้อ')
      return
    }
    if (!noticeForm.content.trim() || noticeForm.content === '<p></p>') {
      alert('กรุณากรอกเนื้อหา')
      return
    }
    if (noticeForm.scope === 'user' && !noticeForm.userId) {
      alert('กรุณาระบุรหัสสมาชิก (user_id)')
      return
    }
    setSaving(true)
    try {
      await adminSaveUserNotice(noticeForm)
      setEditingNotice(null)
      await load()
      alert('บันทึกสำเร็จ — สมาชิกจะเห็นใน #/msg')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNotice = async (item: AdminUserNotice) => {
    if (!isAdmin) return
    if (!window.confirm(`ลบข้อความ "${item.title}"?`)) return
    setSaving(true)
    try {
      await adminDeleteUserNotice(item.id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const tabBanner =
    tab === 'promotions'
      ? 'จัดการโปรโมชั่นที่สมาชิกเห็นใน โบนัส → โปรโมชั่น (#/activity)'
      : tab === 'vip'
        ? 'จัดการระดับ VIP ที่สมาชิกเห็นใน โบนัส (#/caijin)'
        : 'จัดการข้อความที่สมาชิกเห็นใน โบนัส → ข้อความของฉัน (#/msg)'

  return (
    <AdminPageLayout title="จัดการโบนัส" showBack onBack={onBack}>
      <div className="bg-white px-3 py-3 ring-1 ring-black/5">
        <TabBar
          tabs={[
            { value: 'promotions', label: 'โปรโมชั่น' },
            { value: 'vip', label: 'VIP' },
            { value: 'messages', label: 'ข้อความ' },
          ]}
          active={tab}
          onChange={(v) => {
            setTab(v as BonusTab)
            cancelEdit()
          }}
          variant="pill"
        />
      </div>

      <div className={cn(AD.pagePad, AD.stack)}>
        <p className={cn(AD.bannerSm, 'bg-[#fff3e0] text-[#e65100]')}>{tabBanner}</p>

        {!isAdmin && (
          <p className={cn(AD.bannerSm, 'bg-[#fff8e1] text-[#f57c00]')}>
            ตัวแทนดูได้อย่างเดียว — แก้ไขได้เฉพาะผู้ดูแลระบบ
          </p>
        )}

        {tab === 'promotions' && (
          <p className={cn(AD.bannerSm, 'bg-[#eef2ff] text-[#4e72f3]')}>
            รัน{' '}
            <code className="rounded bg-white/70 px-1 text-xs">fix_admin_bonus_cms.sql</code>{' '}
            ใน Supabase ก่อนครั้งแรก (ครั้งเดียว)
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-base text-[#ee0a24]">
            {error}
          </p>
        )}

        {tab === 'promotions' && (
          <>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABELS) as unknown as ActivityCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setPromoCategory(cat)
                    cancelEdit()
                  }}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition',
                    promoCategory === cat
                      ? 'border-[#4e72f3] bg-[#eef2ff] text-[#4e72f3]'
                      : 'border-[#ddd] bg-white text-[#666]',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-center text-[#888]">กำลังโหลด...</p>
            ) : (
              <ul className="space-y-3">
                {filteredActivities.map((item) => (
                  <li
                    key={item.id}
                    className={cn(AD.card, editingPromo === item.id && 'ring-2 ring-[#4e72f3]')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Gift className="h-5 w-5 shrink-0 text-[#ff9800]" />
                          <span className={AD.titleMd}>{item.title}</span>
                          <AdminBadge
                            label={item.status === 1 ? 'เปิด' : 'ปิด'}
                            className={item.status === 1 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'}
                          />
                        </div>
                        {item.text && <p className={cn('mt-2', AD.body)}>{item.text}</p>}
                        {item.images && (
                          <img
                            src={item.images}
                            alt=""
                            className="mt-2 max-h-24 rounded-lg object-cover"
                          />
                        )}
                        <p className={cn('mt-2', AD.hint)}>ลำดับ: {item.sort}</p>
                      </div>
                      {isAdmin && editingPromo !== item.id && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867]')}
                            onClick={() => startEditPromo(item)}
                          >
                            <Pencil className="mr-1 inline h-4 w-4" />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className={cn(AD.btnAction, 'border border-[#ffcdd2] text-[#c62828]')}
                            onClick={() => void handleDeletePromo(item)}
                            disabled={saving}
                          >
                            <Trash2 className="mr-1 inline h-4 w-4" />
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {filteredActivities.length === 0 && editingPromo !== 'new' && (
                  <p className="py-8 text-center text-[#888]">ยังไม่มีโปรโมชั่นในหมวดนี้</p>
                )}
              </ul>
            )}

            {isAdmin && editingPromo === null && (
              <button
                type="button"
                onClick={startNewPromo}
                className={cn(
                  AD.btn,
                  'flex items-center justify-center gap-2 border-2 border-dashed border-[#4e72f3]/40 bg-white text-[#4e72f3]',
                )}
              >
                <Plus className="h-5 w-5" />
                เพิ่มโปรโมชั่น
              </button>
            )}

            {isAdmin && editingPromo !== null && (
              <section className={cn(AD.card, 'space-y-4')}>
                <h3 className={AD.titleMd}>
                  {editingPromo === 'new' ? 'เพิ่มโปรโมชั่น' : 'แก้ไขโปรโมชั่น'}
                </h3>
                <label className="block">
                  <span className={AD.label}>หมวด</span>
                  <select
                    value={promoForm.categoryId}
                    onChange={(e) =>
                      setPromoForm((f) => ({ ...f, categoryId: Number(e.target.value) as ActivityCategory }))
                    }
                    className={cn(AD.select, 'mt-1.5')}
                  >
                    <option value={68}>{CATEGORY_LABELS[68]}</option>
                    <option value={69}>{CATEGORY_LABELS[69]}</option>
                  </select>
                </label>
                <label className="block">
                  <span className={AD.label}>หัวข้อ</span>
                  <input
                    type="text"
                    value={promoForm.title}
                    onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>รายละเอียด</span>
                  <textarea
                    value={promoForm.text ?? ''}
                    onChange={(e) => setPromoForm((f) => ({ ...f, text: e.target.value }))}
                    rows={3}
                    className={cn(AD.textarea, 'mt-1.5')}
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>URL รูปภาพ</span>
                  <input
                    type="url"
                    value={promoForm.images ?? ''}
                    onChange={(e) => setPromoForm((f) => ({ ...f, images: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                    placeholder="/assets/banners/..."
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={AD.label}>ลำดับ</span>
                    <input
                      type="number"
                      min={0}
                      value={promoForm.sort}
                      onChange={(e) => setPromoForm((f) => ({ ...f, sort: Number(e.target.value) }))}
                      className={cn(AD.input, 'mt-1.5')}
                    />
                  </label>
                  <label className="block">
                    <span className={AD.label}>สถานะ</span>
                    <select
                      value={promoForm.status}
                      onChange={(e) =>
                        setPromoForm((f) => ({ ...f, status: Number(e.target.value) as 0 | 1 }))
                      }
                      className={cn(AD.select, 'mt-1.5')}
                    >
                      <option value={1}>เปิด</option>
                      <option value={0}>ปิด</option>
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
                    onClick={() => void handleSavePromo()}
                    className={cn(AD.btnAction, 'flex-1 bg-[#4e72f3] text-white disabled:opacity-60')}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {tab === 'vip' && (
          <>
            {loading ? (
              <p className="text-center text-[#888]">กำลังโหลด...</p>
            ) : (
              <ul className="space-y-3">
                {vipTiers.map((item) => (
                  <li
                    key={item.level}
                    className={cn(AD.card, editingVip === item.level && 'ring-2 ring-[#4e72f3]')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-12 w-12 object-contain" />
                        ) : (
                          <Star className="h-8 w-8 text-[#6390ff]" />
                        )}
                        <div>
                          <p className={AD.titleMd}>VIP {item.level}</p>
                          <p className={AD.value}>
                            ฝากสะสม {item.depositRequired.toLocaleString()} บาท
                          </p>
                          <p className={AD.hint}>ลำดับ: {item.sort}</p>
                        </div>
                      </div>
                      {isAdmin && editingVip !== item.level && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867]')}
                            onClick={() => startEditVip(item)}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className={cn(AD.btnAction, 'border border-[#ffcdd2] text-[#c62828]')}
                            onClick={() => void handleDeleteVip(item.level)}
                            disabled={saving}
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {vipTiers.length === 0 && editingVip !== 'new' && (
                  <p className="py-8 text-center text-[#888]">ยังไม่มีระดับ VIP</p>
                )}
              </ul>
            )}

            {isAdmin && editingVip === null && (
              <button
                type="button"
                onClick={startNewVip}
                className={cn(
                  AD.btn,
                  'flex items-center justify-center gap-2 border-2 border-dashed border-[#4e72f3]/40 bg-white text-[#4e72f3]',
                )}
              >
                <Plus className="h-5 w-5" />
                เพิ่มระดับ VIP
              </button>
            )}

            {isAdmin && editingVip !== null && (
              <section className={cn(AD.card, 'space-y-4')}>
                <h3 className={AD.titleMd}>
                  {editingVip === 'new' ? 'เพิ่มระดับ VIP' : `แก้ไข VIP ${vipForm.level}`}
                </h3>
                <label className="block">
                  <span className={AD.label}>ระดับ (1–99)</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={vipForm.level}
                    disabled={editingVip !== 'new'}
                    onChange={(e) => setVipForm((f) => ({ ...f, level: Number(e.target.value) }))}
                    className={cn(AD.input, 'mt-1.5')}
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>ยอดฝากสะสม (บาท)</span>
                  <input
                    type="number"
                    min={0}
                    value={vipForm.depositRequired}
                    onChange={(e) =>
                      setVipForm((f) => ({ ...f, depositRequired: Number(e.target.value) }))
                    }
                    className={cn(AD.input, 'mt-1.5')}
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>URL รูปไอคอน</span>
                  <input
                    type="text"
                    value={vipForm.image ?? ''}
                    onChange={(e) => setVipForm((f) => ({ ...f, image: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                    placeholder="/assets/bonus/vip-1.png"
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>ลำดับแสดง</span>
                  <input
                    type="number"
                    min={0}
                    value={vipForm.sort}
                    onChange={(e) => setVipForm((f) => ({ ...f, sort: Number(e.target.value) }))}
                    className={cn(AD.input, 'mt-1.5')}
                  />
                </label>
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
                    onClick={() => void handleSaveVip()}
                    className={cn(AD.btnAction, 'flex-1 bg-[#4e72f3] text-white disabled:opacity-60')}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {tab === 'messages' && (
          <>
            {loading ? (
              <p className="text-center text-[#888]">กำลังโหลด...</p>
            ) : (
              <ul className="space-y-3">
                {notices.map((item) => (
                  <li
                    key={item.id}
                    className={cn(AD.card, editingNotice === item.id && 'ring-2 ring-[#4e72f3]')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Mail className="h-5 w-5 shrink-0 text-[#2196f3]" />
                          <span className={AD.titleMd}>{item.title}</span>
                          <AdminBadge
                            label={item.scope === 'broadcast' ? 'ทุกคน' : `@${item.username ?? item.userId}`}
                            className={
                              item.scope === 'broadcast'
                                ? 'bg-[#e3f2fd] text-[#1565c0]'
                                : 'bg-[#f3e5f5] text-[#7b1fa2]'
                            }
                          />
                        </div>
                        <p className={cn('mt-2 line-clamp-2', AD.body)}>
                          {item.content.replace(/<[^>]+>/g, ' ').trim()}
                        </p>
                        <p className={cn('mt-2', AD.hint)}>{formatTimestamp(item.createtime)}</p>
                      </div>
                      {isAdmin && editingNotice !== item.id && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            className={cn(AD.btnAction, 'border border-[#ebedf0] text-[#535867]')}
                            onClick={() => startEditNotice(item)}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className={cn(AD.btnAction, 'border border-[#ffcdd2] text-[#c62828]')}
                            onClick={() => void handleDeleteNotice(item)}
                            disabled={saving}
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {notices.length === 0 && editingNotice !== 'new' && (
                  <p className="py-8 text-center text-[#888]">ยังไม่มีข้อความ</p>
                )}
              </ul>
            )}

            {isAdmin && editingNotice === null && (
              <button
                type="button"
                onClick={startNewNotice}
                className={cn(
                  AD.btn,
                  'flex items-center justify-center gap-2 border-2 border-dashed border-[#4e72f3]/40 bg-white text-[#4e72f3]',
                )}
              >
                <Plus className="h-5 w-5" />
                ส่งข้อความใหม่
              </button>
            )}

            {isAdmin && editingNotice !== null && (
              <section className={cn(AD.card, 'space-y-4')}>
                <h3 className={AD.titleMd}>
                  {editingNotice === 'new' ? 'ส่งข้อความใหม่' : 'แก้ไขข้อความ'}
                </h3>
                <label className="block">
                  <span className={AD.label}>ประเภท</span>
                  <select
                    value={noticeForm.scope}
                    onChange={(e) =>
                      setNoticeForm((f) => ({
                        ...f,
                        scope: e.target.value as 'broadcast' | 'user',
                        userId: e.target.value === 'broadcast' ? undefined : f.userId,
                      }))
                    }
                    className={cn(AD.select, 'mt-1.5')}
                  >
                    <option value="broadcast">ประกาศทุกคน (broadcast)</option>
                    <option value="user">ส่งถึงสมาชิกรายคน</option>
                  </select>
                </label>
                {noticeForm.scope === 'user' && (
                  <label className="block">
                    <span className={AD.label}>รหัสสมาชิก (user_id)</span>
                    <input
                      type="number"
                      min={1}
                      value={noticeForm.userId ?? ''}
                      onChange={(e) =>
                        setNoticeForm((f) => ({
                          ...f,
                          userId: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className={cn(AD.input, 'mt-1.5')}
                      placeholder="ดูได้จากหน้า สมาชิก"
                    />
                  </label>
                )}
                <label className="block">
                  <span className={AD.label}>หัวข้อ</span>
                  <input
                    type="text"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                    className={cn(AD.input, 'mt-1.5')}
                  />
                </label>
                <label className="block">
                  <span className={AD.label}>เนื้อหา (HTML ได้ เช่น &lt;p&gt;...&lt;/p&gt;)</span>
                  <textarea
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))}
                    rows={6}
                    className={cn(AD.textarea, 'mt-1.5 font-mono text-sm')}
                  />
                </label>
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
                    onClick={() => void handleSaveNotice()}
                    className={cn(AD.btnAction, 'flex-1 bg-[#4e72f3] text-white disabled:opacity-60')}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminPageLayout>
  )
}
