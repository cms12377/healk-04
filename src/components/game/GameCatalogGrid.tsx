import { resolveGameImage } from '@/constants/assets'
import { getLotteryDisplayName } from '@/lib/homeNavigation'
import type { LotteryItem } from '@/types'
import { cn } from '@/lib/utils'

interface GameCatalogGridProps {
  items: LotteryItem[]
  onItemClick: (item: LotteryItem) => void
  title?: string
  className?: string
}

export function GameCatalogGridSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'mx-3 animate-pulse overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="h-5 w-24 rounded bg-gray-200" />
        <div className="h-5 w-14 rounded-full bg-gray-200" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center px-2 py-4">
            <div className="h-[72px] w-[72px] rounded-2xl bg-gray-100" />
            <div className="mt-2 h-3 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GameCatalogGrid({
  items,
  onItemClick,
  title = 'เกมทั้งหมด',
  className,
}: GameCatalogGridProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-bold text-[#2c3345]">{title}</h2>
        <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-xs font-semibold text-[#4e72f3]">
          {items.length} เกม
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-y divide-gray-100">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="group relative flex flex-col items-center px-2 py-4 transition-colors hover:bg-[#f8faff] active:bg-[#eef3ff]"
          >
            {item.isHot && (
              <span className="absolute right-2 top-2 rounded-full bg-gradient-to-r from-[#ff7043] to-[#e53935] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                Hot
              </span>
            )}
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-b from-gray-50 to-white p-0.5 shadow-sm ring-1 ring-gray-100 transition group-hover:shadow-md group-active:scale-95">
              <img
                src={resolveGameImage(item.code, item.image)}
                alt=""
                className="h-full w-full rounded-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-center text-xs font-semibold leading-snug text-[#535867] group-hover:text-[#3880e5]">
              {getLotteryDisplayName(item)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
