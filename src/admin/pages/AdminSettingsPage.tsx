import { useCallback, useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { adminFetchSettings, adminUpdateSettings } from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface AdminSettingsPageProps {
  onBack: () => void
}

export function AdminSettingsPage({ onBack }: AdminSettingsPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [notice, setNotice] = useState('')
  const [currency, setCurrency] = useState('฿')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const cfg = await adminFetchSettings()
      setNotice(cfg.notice)
      setCurrency(cfg.currency)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดตั้งค่าไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async () => {
    if (!isAdmin) {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้')
      return
    }
    setSaving(true)
    try {
      const cfg = await adminUpdateSettings({ notice, currency })
      setNotice(cfg.notice)
      setCurrency(cfg.currency)
      alert('บันทึกสำเร็จ')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageLayout title="ตั้งค่า" showBack onBack={onBack}>
      <div className={cn(AD.pagePad, AD.stack, AD.card)}>
        <div className="rounded-xl bg-linear-to-br from-[#427ffa] to-[#5f97ff] p-5 text-center text-white">
          <p className="text-lg font-medium opacity-95">ตั้งค่าเว็บไซต์</p>
          <p className="mt-1 text-base opacity-85">
            แชทบริการทำงานภายในระบบ — ตอบกลับได้ที่เมนู แชทบริการ
          </p>
        </div>

        {loading ? (
          <p className="text-center text-base text-[#888]">กำลังโหลด...</p>
        ) : (
          <>
            {error && (
              <p className="text-center text-base text-[#ee0a24]">
                {error}
                <button type="button" onClick={() => void load()} className="ml-1 text-[#427ffa]">
                  ลองใหม่
                </button>
              </p>
            )}

            <section>
              <h3 className={cn('mb-3', AD.titleMd)}>ประกาศหน้าแรก (notice)</h3>
              <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                disabled={!isAdmin}
                rows={4}
                placeholder="ข้อความประกาศ..."
                className={cn(AD.textarea, 'disabled:bg-[#f5f5f5]')}
              />
            </section>

            <section>
              <h3 className={cn('mb-3', AD.titleMd)}>สัญลักษณ์เงิน (currency)</h3>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={!isAdmin}
                maxLength={8}
                className={cn(AD.input, 'w-28 disabled:bg-[#f5f5f5]')}
              />
            </section>

            {!isAdmin && (
              <p className={cn(AD.bannerSm, 'bg-[#fff8e1] text-[#f57c00]')}>
                บัญชีตัวแทนดูได้อย่างเดียว — แก้ไขได้เฉพาะผู้ดูแลระบบ
              </p>
            )}

            {isAdmin && (
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => void handleSave()}
                className={cn(
                  AD.btn,
                  'bg-[#5f97ff] text-white shadow-[inset_0_2px_#4e86ff] disabled:opacity-60',
                )}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            )}
          </>
        )}
      </div>
    </AdminPageLayout>
  )
}
