import { ASSETS } from '@/constants/assets'
import { APP_NAME, APP_TAGLINE } from '@/constants/branding'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useAuth } from '@/context/AuthContext'

interface AppHeaderProps {
  onLoginClick: () => void
}

export function AppHeader({ onLoginClick }: AppHeaderProps) {
  const { user, isLoggedIn, logout } = useAuth()

  return (
    <header className="header sticky top-0 z-[999] flex w-full items-center justify-between px-3 pb-2.5 pt-2 text-white shadow-md shadow-[#3880e5]/25">
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          src={ASSETS.logo}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/30"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold tracking-wide">{APP_NAME}</p>
          <p className="truncate text-[10px] font-medium text-white/75">{APP_TAGLINE}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isLoggedIn && (
          <>
            <UserAvatar
              src={user!.avatar}
              name={user!.nickname}
              size="md"
              variant="header"
            />
            <span className="hidden max-w-[80px] truncate text-sm font-medium sm:inline">
              {user!.nickname}
            </span>
          </>
        )}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#3a81e7] shadow-sm transition hover:bg-white active:scale-95"
          >
            ออกจากระบบ
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3a81e7] shadow-sm transition hover:bg-white/95 active:scale-95"
          >
            เข้าสู่ระบบ
          </button>
        )}
      </div>
    </header>
  )
}
