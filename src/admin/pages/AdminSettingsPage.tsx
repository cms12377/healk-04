import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
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
  const [serviceUrl, setServiceUrl] = useState('')
  const [currency, setCurrency] = useState('฿')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const cfg = await adminFetchSettings()
      setNotice(cfg.notice)
      setServiceUrl(cfg.serviceUrl)
      setCurrency(cfg.currency)
      setPreviewUrl(cfg.serviceUrl)
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
      const cfg = await adminUpdateSettings({ notice, serviceUrl, currency })
      setNotice(cfg.notice)
      setServiceUrl(cfg.serviceUrl)
      setCurrency(cfg.currency)
      setPreviewUrl(cfg.serviceUrl)
      alert('บันทึกสำเร็จ')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    const url = serviceUrl.trim()
    if (!url) {
      alert('กรุณากรอก URL แชทก่อน')
      return
    }
    setPreviewUrl(url)
  }

  return (
    <AdminPageLayout title="แชท & ตั้งค่า" showBack onBack={onBack}>
      <div className={cn(AD.pagePad, AD.stack, AD.card)}>
        <div className="rounded-xl bg-linear-to-br from-[#427ffa] to-[#5f97ff] p-5 text-center text-white">
          <p className="text-lg font-medium opacity-95">ลิงก์แชทฝ่ายบริการ</p>
          <p className="mt-1 text-base opacity-85">
            สมาชิกเห็นหน้า #/service เป็น iframe จาก URL นี้
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
              <h3 className={cn('mb-3', AD.titleMd)}>URL แชท (service_url)</h3>
              <input
                type="url"
                value={serviceUrl}
                onChange={(e) => setServiceUrl(e.target.value)}
                disabled={!isAdmin}
                placeholder="https://msg.example.com?..."
                className={cn(AD.input, 'disabled:bg-[#f5f5f5]')}
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  className={cn(
                    AD.btnSm,
                    'flex flex-1 items-center justify-center gap-2 border-2 border-[#427ffa] text-[#427ffa]',
                  )}
                >
                  <ExternalLink className="h-5 w-5" />
                  ดูตัวอย่างด้านล่าง
                </button>
                {serviceUrl.trim() && (
                  <a
                    href={serviceUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      AD.btnSm,
                      'flex flex-1 items-center justify-center border-2 border-[#ddd] text-[#666]',
                    )}
                  >
                    เปิดแท็บใหม่
                  </a>
                )}
              </div>
            </section>

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

      {previewUrl && (
        <div className={cn(AD.pagePad, 'overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5')}>
          <p className="border-b border-[#eee] px-4 py-3 text-base font-medium text-[#888]">
            ตัวอย่าง iframe แชท
          </p>
          <iframe
            title="ตัวอย่างแชท"
            src={previewUrl}
            className="h-[360px] w-full border-0"
            allow="microphone; camera; clipboard-read; clipboard-write"
          />
        </div>
      )}
    </AdminPageLayout>
  )
}
