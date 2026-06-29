import { ASSETS } from '@/constants/assets'
import { useAuth } from '@/context/AuthContext'

interface AppHeaderProps {
  onLoginClick: () => void
}

export function AppHeader({ onLoginClick }: AppHeaderProps) {
  const { user, isLoggedIn, logout } = useAuth()

  return (
    <header className="header sticky top-0 z-[999] flex w-full items-center justify-between bg-linear-to-br from-[#3880e5] to-[#86a7ff] px-2.5 pb-[7px] pt-[2px] text-white">
      <div className="flex" />
      <div className="flex items-center gap-2.5">
        <div className="flex">
          {isLoggedIn ? (
            <img src={user!.avatar} alt="" className="h-[30px] w-[30px] rounded-full object-cover" />
          ) : (
            <img src={ASSETS.logo} alt="" className="h-[30px] w-[30px] rounded-full object-cover" />
          )}
        </div>
        {isLoggedIn && <span className="max-w-[80px] truncate text-sm">{user!.nickname}</span>}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-[30px] bg-white px-2.5 py-1 text-[13px] text-[#3a81e7]"
          >
            ออกจากระบบ
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-[30px] bg-white px-2.5 py-1 text-[13px] text-[#3a81e7]"
          >
            เข้าสู่ระบบ
          </button>
        )}
      </div>
    </header>
  )
}
