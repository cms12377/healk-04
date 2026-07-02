import { ChevronRight, TrendingUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PrimaryButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { uploadAvatar } from '@/lib/memberUploads'
import { useAuth } from '@/context/AuthContext'
import type { SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface ProfilePageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
}

export function ProfilePage({ onBack, onNavigate }: ProfilePageProps) {
  const { user, updateProfile, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  const onAvatarPick = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage('กรุณาเลือกไฟล์รูปภาพ')
      return
    }
    if (file.size > 512_000) {
      setMessage('รูปต้องไม่เกิน 512 KB')
      return
    }

    setUploading(true)
    setMessage('')
    try {
      const avatarUrl = await uploadAvatar(file)
      await updateProfile({ avatar: avatarUrl })
      await refreshUser()
      setMessage('อัปเดตรูปโปรไฟล์สำเร็จ')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  const saveNickname = async () => {
    if (!nickname.trim()) {
      setMessage('กรุณากรอกชื่อเล่น')
      return
    }
    setMessage('')
    try {
      await updateProfile({ nickname: nickname.trim() })
      await refreshUser()
      setEditing(false)
      setMessage('บันทึกสำเร็จ')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <SubPageShell title="ศูนย์ส่วนตัว" onBack={onBack}>
      <SubCard className="mt-3">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
          <span className="text-sm text-[#969799]">รูปโปรไฟล์</span>
          <button
            type="button"
            className="relative ml-auto disabled:opacity-60"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <UserAvatar
              src={user?.avatar}
              name={user?.nickname}
              size="lg"
              className="h-14 w-14"
            />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-xs text-white">
                ...
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onAvatarPick(file)
              e.target.value = ''
            }}
          />
        </div>

        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <span className="shrink-0 text-sm text-[#969799]">ชื่อเล่น</span>
          {editing ? (
            <div className="ml-auto flex items-center gap-2">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-[140px] rounded-lg border border-[#ebedf0] px-2.5 py-1.5 text-sm outline-none focus:border-[#4e72f3] focus:ring-1 focus:ring-[#4e72f3]/20"
              />
              <PrimaryButton className="!h-8 !w-auto !px-3 !text-xs" onClick={saveNickname}>
                บันทึก
              </PrimaryButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto text-sm font-medium text-[#2c3345]"
            >
              {user?.nickname}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-sm text-[#969799]">บัญชี</span>
          <span className="ml-auto text-sm font-medium text-[#2c3345]">{user?.username}</span>
        </div>
      </SubCard>

      {message && (
        <p
          className={cn(
            'mt-3 text-center text-sm',
            message.includes('สำเร็จ') ? 'text-[#2e7d32]' : 'text-[#c62828]',
          )}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => onNavigate('profits')}
        className="mx-3 mt-4 flex w-[calc(100%-24px)] items-center justify-between rounded-xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/5 transition hover:bg-[#f8faff] active:scale-[0.99]"
      >
        <span className="flex items-center gap-3 text-sm font-medium text-[#2c3345]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4e72f3]">
            <TrendingUp className="h-4 w-4" strokeWidth={2.2} />
          </span>
          ดูสรุปกำไร-ขาดทุน
        </span>
        <ChevronRight className="h-4 w-4 text-[#c8c9cc]" strokeWidth={2} />
      </button>
    </SubPageShell>
  )
}
