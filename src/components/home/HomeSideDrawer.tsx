import { ASSETS } from '@/constants/assets'
import { useAuth } from '@/context/AuthContext'
import type { SubPage } from '@/types'

interface HomeSideDrawerProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: SubPage, params?: Record<string, string>) => void
  onServiceClick: () => void
}

export function HomeSideDrawer({
  open,
  onClose,
  onNavigate,
  onServiceClick,
}: HomeSideDrawerProps) {
  const { user, isLoggedIn, logout } = useAuth()

  if (!open) return null

  const handleNav = (page: SubPage, params?: Record<string, string>) => {
    onClose()
    onNavigate(page, params)
  }

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-[50%] min-w-[240px] max-w-[320px] flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[150px] flex-col items-center justify-center gap-1 bg-linear-to-br from-[#3880e5] to-[#86a7ff] text-white">
          <img
            src={user?.avatar ?? ASSETS.logo}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
          <p className="text-base">ยอดเงินคงเหลือ</p>
          <p className="text-lg font-semibold">
            {isLoggedIn ? `${(user?.balance ?? 0).toLocaleString()} ฿` : '—'}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-b border-[#eee] py-5 pl-8">
          <button
            type="button"
            disabled={!isLoggedIn}
            onClick={() => handleNav('game-bet', { status: '1' })}
            className="flex w-full items-center gap-5 text-left text-[#333] disabled:opacity-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff3e6] text-lg">
              🏆
            </span>
            <span>
              <span className="mb-1 block text-[15px]">กำไรวันนี้</span>
              <span className="text-xs text-[#888]">
                {isLoggedIn ? `${(user?.dayWin ?? 0).toLocaleString()} ฿` : 'เข้าสู่ระบบก่อน'}
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={!isLoggedIn}
            onClick={() => handleNav('game-bet', { status: '0' })}
            className="flex w-full items-center gap-5 text-left text-[#333] disabled:opacity-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4ff] text-lg">
              ⏳
            </span>
            <span>
              <span className="mb-1 block text-[15px]">ยอดรอผล</span>
              <span className="text-xs text-[#888]">
                {isLoggedIn ? `${(user?.unsettled ?? 0).toLocaleString()} ฿` : 'เข้าสู่ระบบก่อน'}
              </span>
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-4 py-5 pl-8">
          <button
            type="button"
            onClick={() => {
              onClose()
              onServiceClick()
            }}
            className="flex w-full items-center gap-5 text-left text-[#333]"
          >
            <img src={ASSETS.serviceIcon} alt="" className="h-8 w-8" />
            <span className="text-[15px]">บริการลูกค้า</span>
          </button>
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                onClose()
                void logout()
              }}
              className="flex w-full items-center gap-5 text-left text-[#333]"
            >
              <img src={ASSETS.logoutIcon} alt="" className="h-8 w-8" />
              <span className="text-[15px]">ออกจากระบบ</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
