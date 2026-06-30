import { ChevronRight, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PrimaryButton } from '@/components/common/PageNavBar'
import { SubCard, SubPageShell } from '@/components/my/sub/SubPageShell'
import { useAuth } from '@/context/AuthContext'
import type { SubPage } from '@/types'
import { cn } from '@/lib/utils'

interface ProfilePageProps {
  onBack: () => void
  onNavigate: (page: SubPage) => void
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
    <SubPageShell title="โปรไฟล์" onBack={onBack}>
      <SubCard className="mt-3">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
          <span className="text-sm text-[#969799]">รูปโปรไฟล์</span>
          <UserAvatar
            src={user?.avatar}
            name={user?.nickname}
            size="lg"
            className="ml-auto"
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
            message.includes('สำเร็จ') ? 'text-[#2e7d32]' : 'text-[#4e72f3]',
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
