import { useState } from 'react'
import { PageNavBar, PrimaryButton } from '@/components/common/PageNavBar'
import { useAuth } from '@/context/AuthContext'

interface ProfilePageProps {
  onBack: () => void
  onNavigate: (page: import('@/types').SubPage) => void
}

export function ProfilePage({ onBack, onNavigate }: ProfilePageProps) {
  const { user, updateProfile } = useAuth()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')

  const saveNickname = async () => {
    if (!nickname.trim()) {
      setMessage('กรุณากรอกชื่อเล่น')
      return
    }
    try {
      await updateProfile({ nickname: nickname.trim() })
      setEditing(false)
      setMessage('บันทึกสำเร็จ')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PageNavBar title="โปรไฟล์" showBack onBack={onBack} />

      <div className="mx-2.5 mt-2.5 rounded-lg bg-white p-4">
        <div className="flex items-center gap-3 border-b border-[#eee] py-3">
          <span className="text-[#888]">รูปโปรไฟล์</span>
          <img
            src={user?.avatar}
            alt=""
            className="ml-auto h-12 w-12 rounded-full object-cover"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-[#eee] py-3">
          <span className="shrink-0 text-[#888]">ชื่อเล่น</span>
          {editing ? (
            <div className="ml-auto flex items-center gap-2">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-[120px] rounded border border-[#ddd] px-2 py-1 text-sm"
              />
              <PrimaryButton className="!h-8 !px-3 !text-xs" onClick={saveNickname}>
                บันทึก
              </PrimaryButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto text-sm text-[#333]"
            >
              {user?.nickname}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 py-3">
          <span className="text-[#888]">บัญชี</span>
          <span className="ml-auto text-sm text-[#333]">{user?.username}</span>
        </div>
      </div>

      {message && (
        <p className="mt-3 text-center text-sm text-[#427ffa]">{message}</p>
      )}

      <button
        type="button"
        onClick={() => onNavigate('profits')}
        className="mx-2.5 mt-4 block w-[calc(100%-20px)] rounded-lg border border-[#427ffa] py-2.5 text-center text-sm text-[#427ffa]"
      >
        ดูสรุปกำไร-ขาดทุน
      </button>
    </div>
  )
}
