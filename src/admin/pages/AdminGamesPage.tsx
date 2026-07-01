import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, RefreshCw } from 'lucide-react'
import { AD } from '@/admin/adminUi'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import {
  adminAdvanceGame,
  adminFetchGames,
  adminSetDrawMode,
  adminSetGameStatus,
  adminSetNextDrawResult,
  adminSetRandomWinRate,
  adminTickGameCountdowns,
  type AdminGameInfo,
} from '@/services/admin'
import { syncDueGames } from '@/services/gameSync'
import { useAuth } from '@/context/AuthContext'
import { drawModeLabel, getDrawResultHint } from '@/lib/drawResultFormat'
import { formatCountdownMmSs, GAME_REGISTRY } from '@/lib/gameIntervals'
import { cn } from '@/lib/utils'

interface AdminGamesPageProps {
  onBack: () => void
}

function memberGameHash(code: string, gameId: number): string {
  const row = GAME_REGISTRY.find((g) => g.code === code)
  const path = row?.path ?? 'pkShi'
  return `#/${path}?type=${encodeURIComponent(code)}&category_id=${gameId}`
}

function StatChip({
  label,
  value,
  valueClassName,
  children,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
  children?: ReactNode
}) {
  return (
    <div className="flex w-[132px] shrink-0 snap-start flex-col rounded-xl bg-[#f8f9fa] px-3 py-3 ring-1 ring-black/5">
      <span className="text-sm font-medium text-[#888]">{label}</span>
      <p className={cn('mt-1 truncate text-base font-semibold tabular-nums text-[#333]', valueClassName)}>
        {value}
      </p>
      {children}
    </div>
  )
}

function GameDrawControls({
  game,
  isAdmin,
  busy,
  onRefresh,
}: {
  game: AdminGameInfo
  isAdmin: boolean
  busy: boolean
  onRefresh: () => Promise<void>
}) {
  const [preset, setPreset] = useState(game.nextDrawResult ?? '')
  const [winRatePct, setWinRatePct] = useState(Math.round((game.randomWinRate ?? 0.3) * 100))
  const hint = getDrawResultHint(game.code)
  const needsPreset =
    game.drawMode === 'manual' && !game.nextDrawResult && (game.secondsLeft ?? 999) <= 120

  useEffect(() => {
    setPreset(game.nextDrawResult ?? '')
    setWinRatePct(Math.round((game.randomWinRate ?? 0.3) * 100))
  }, [game.nextDrawResult, game.randomWinRate, game.id])

  const handleModeChange = async (mode: 'random' | 'manual') => {
    if (game.drawMode === mode) return
    const msg =
      mode === 'random'
        ? `เปลี่ยน ${game.name} เป็นโหมดคาสิโน (อัตโนมัติ)?\nระบบออกผลเอง — สมาชิกชนะ ~${winRatePct}% / เจ้ามือได้เปรียบ ~${100 - winRatePct}% ต่อรายการเดิมพัน`
        : `เปลี่ยน ${game.name} เป็นโหมดกำหนดผลเอง?\nคุณควบคุมผลทุกงวด — ใช้เมื่อต้องการ lock ผลล่วงหน้า`
    if (!window.confirm(msg)) return
    try {
      await adminSetDrawMode(game.id, mode)
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'เปลี่ยนโหมดไม่สำเร็จ')
    }
  }

  const handleSavePreset = async () => {
    try {
      await adminSetNextDrawResult(game.id, preset.trim())
      alert('บันทึกผลงวดถัดไปแล้ว')
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'รูปแบบผลไม่ถูกต้อง')
    }
  }

  const handleClearPreset = async () => {
    if (!window.confirm('ล้างผลที่กำหนดไว้?')) return
    try {
      await adminSetNextDrawResult(game.id, '')
      setPreset('')
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ล้างผลไม่สำเร็จ')
    }
  }

  const handleSaveWinRate = async () => {
    const pct = Number(winRatePct)
    if (pct < 5 || pct > 50) {
      alert('อัตราชนะสมาชิกต้องอยู่ระหว่าง 5%–50% (เจ้ามือได้เปรียบขั้นต่ำ 50%)')
      return
    }
    try {
      await adminSetRandomWinRate(game.id, pct / 100)
      alert('บันทึกอัตราชนะสมาชิกแล้ว')
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-[#eee] pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className={AD.label}>โหมดออกผล</span>
        <span
          className={cn(
            AD.badge,
            game.drawMode === 'manual'
              ? 'bg-[#fff3e0] text-[#e65100]'
              : 'bg-[#e8f5e9] text-[#2e7d32]',
          )}
        >
          {drawModeLabel(game.drawMode)}
        </span>
      </div>

      {needsPreset && (
        <p className={cn(AD.bannerSm, 'flex items-start gap-2 bg-[#fff3e0] text-[#e65100]')}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          ยังไม่มีผลงวด {game.issue ?? '—'} — ระบบจะไม่ออกผลจนกว่าจะตั้งค่า
        </p>
      )}

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || game.drawMode === 'random'}
              onClick={() => void handleModeChange('random')}
              className={cn(
                'rounded-xl px-3 py-2.5 text-sm font-semibold',
                game.drawMode === 'random'
                  ? 'bg-[#2e7d32] text-white'
                  : 'border-2 border-[#ddd] text-[#666]',
              )}
            >
              คาสิโน
            </button>
            <button
              type="button"
              disabled={busy || game.drawMode === 'manual'}
              onClick={() => void handleModeChange('manual')}
              className={cn(
                'rounded-xl px-3 py-2.5 text-sm font-semibold',
                game.drawMode === 'manual'
                  ? 'bg-[#e65100] text-white'
                  : 'border-2 border-[#ddd] text-[#666]',
              )}
            >
              กำหนดเอง
            </button>
          </div>

          {game.drawMode === 'random' && (
            <div className="space-y-2 rounded-xl bg-[#f1f8e9] px-3 py-3">
              <p className="text-sm font-medium text-[#33691e]">อัตราชนะสมาชิก (โหมดคาสิโน)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={winRatePct}
                  onChange={(e) => setWinRatePct(Number(e.target.value))}
                  disabled={busy}
                  className="w-16 rounded-lg border border-[#ddd] px-2 py-2 text-center text-base"
                />
                <span className="text-sm text-[#666]">% · เจ้ามือ ~{Math.max(0, 100 - winRatePct)}%</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveWinRate()}
                  className="ml-auto rounded-lg bg-[#2e7d32] px-3 py-2 text-sm font-semibold text-white"
                >
                  บันทึก
                </button>
              </div>
            </div>
          )}

          {game.drawMode === 'manual' && (
            <div className="space-y-2">
              <p className="text-sm text-[#888]">
                ผลงวดถัดไป {game.issue ? `(งวด ${game.issue})` : ''}
              </p>
              <p className="text-xs text-[#aaa]">{hint.hint}</p>
              <input
                type="text"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                placeholder={hint.example}
                disabled={busy}
                className={cn(AD.input, 'font-mono text-sm')}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSavePreset()}
                  className="flex-1 rounded-xl bg-[#5f97ff] py-2.5 text-sm font-semibold text-white"
                >
                  บันทึกผล
                </button>
                {game.nextDrawResult && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleClearPreset()}
                    className="rounded-xl border-2 border-[#ddd] px-4 py-2.5 text-sm text-[#666]"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AdminGameCard({
  game,
  isAdmin,
  busy,
  onRefresh,
  onAdvance,
  onToggleStatus,
}: {
  game: AdminGameInfo
  isAdmin: boolean
  busy: boolean
  onRefresh: () => Promise<void>
  onAdvance: () => void
  onToggleStatus: () => void
}) {
  const hash = memberGameHash(game.code, game.id)

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash)
      alert('คัดลอกลิงก์แล้ว')
    } catch {
      alert(hash)
    }
  }

  return (
    <article className={cn(AD.card, 'flex h-full flex-col')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={AD.titleMd}>{game.name}</p>
          <p className={cn('mt-0.5 truncate', AD.hint)}>
            {game.code} · {game.cycleLabel ?? '—'}/งวด
          </p>
        </div>
        <span
          className={cn(
            AD.badge,
            'shrink-0',
            game.status === 1 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]',
          )}
        >
          {game.status === 1 ? 'เปิด' : 'ปิด'}
        </span>
      </div>

      <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden">
        <StatChip label="รอบ/งวด" value={game.cycleLabel ?? '—'} />
        <StatChip label="งวดปัจจุบัน" value={game.issue ?? '—'} />
        <StatChip
          label="นับถอยหลัง"
          value={formatCountdownMmSs(game.secondsLeft)}
          valueClassName={game.isOverdue ? 'text-[#e65100]' : 'text-[#427ffa]'}
        >
          {game.isOverdue && (
            <p className="mt-1 text-xs leading-tight text-[#e65100]">ถึงเวลาออกผล</p>
          )}
        </StatChip>
        <StatChip
          label="ผลล่าสุด"
          value={
            game.lastIssue ? `${game.lastIssue}` : '—'
          }
        >
          {game.lastResult && (
            <p className="mt-0.5 truncate text-xs text-[#666]">{game.lastResult}</p>
          )}
        </StatChip>
      </div>

      <button
        type="button"
        onClick={() => void copyHash()}
        className="mt-3 flex w-full items-center gap-2 rounded-xl bg-[#f0f7ff] px-3 py-2.5 text-left text-sm text-[#427ffa]"
      >
        <Copy className="h-4 w-4 shrink-0" />
        <span className="truncate font-mono">{hash}</span>
      </button>

      <GameDrawControls game={game} isAdmin={isAdmin} busy={busy} onRefresh={onRefresh} />

      {isAdmin && (
        <div className="mt-auto flex gap-2 pt-3">
          <button
            type="button"
            disabled={busy || !game.issue}
            onClick={onAdvance}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5f97ff] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
            บังคับออกผล
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onToggleStatus}
            className="rounded-xl border-2 border-[#ddd] px-4 py-3 text-sm font-medium text-[#666]"
          >
            {game.status === 1 ? 'ปิด' : 'เปิด'}
          </button>
        </div>
      )}
    </article>
  )
}

export function AdminGamesPage({ onBack }: AdminGamesPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [games, setGames] = useState<AdminGameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const carouselRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const pillsRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await adminFetchGames()
      setGames(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดรายการเกมไม่สำเร็จ')
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      setGames((prev) => adminTickGameCountdowns(prev))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    const anyOverdue = games.some((g) => g.isOverdue)
    if (!anyOverdue || syncingRef.current || loading) return
    syncingRef.current = true
    void syncDueGames()
      .then((n) => {
        if (n > 0) return load()
      })
      .finally(() => {
        syncingRef.current = false
      })
  }, [games, load, loading])

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, games.length)
  }, [games.length])

  useEffect(() => {
    const root = carouselRef.current
    if (!root || games.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = Number((visible.target as HTMLElement).dataset.index)
        if (!Number.isNaN(index)) setActiveIndex(index)
      },
      { root, threshold: 0.55 },
    )

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [games])

  const scrollToGame = (index: number) => {
    const el = cardRefs.current[index]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setActiveIndex(index)

    const pill = pillsRef.current?.children[index] as HTMLElement | undefined
    pill?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const scrollByOne = (delta: number) => {
    const next = Math.max(0, Math.min(games.length - 1, activeIndex + delta))
    scrollToGame(next)
  }

  const handleAdvance = async (game: AdminGameInfo) => {
    const modeNote =
      game.drawMode === 'manual'
        ? game.nextDrawResult
          ? `ใช้ผลที่กำหนด: ${game.nextDrawResult}`
          : '⚠ ยังไม่มีผลที่กำหนด — จะไม่สามารถออกผลได้'
        : 'ระบบจะสุ่มผลอัตโนมัติ'

    if (
      !window.confirm(
        `บังคับออกผล ${game.name} งวด ${game.issue ?? '?'}?\n${modeNote}`,
      )
    ) {
      return
    }
    setBusyId(game.id)
    try {
      const res = await adminAdvanceGame(game.id)
      if (res.skipped) {
        const reason =
          res.reason === 'manual_result_required'
            ? 'ต้องกำหนดผลก่อน (โหมดกำหนดเอง)'
            : res.reason ?? 'unknown'
        alert(`ข้าม: ${reason}`)
      } else {
        alert(
          `ออกผลแล้ว\nงวด: ${res.drawnIssue}\nผล: ${res.result}\nชำระเดิมพัน: ${res.settled} รายการ\nงวดใหม่: ${res.newIssue}`,
        )
      }
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ออกผลไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleStatus = async (game: AdminGameInfo) => {
    const next = game.status === 1 ? 0 : 1
    const label = next === 1 ? 'เปิด' : 'ปิด'
    if (!window.confirm(`${label}เกม ${game.name}?`)) return
    setBusyId(game.id)
    try {
      const list = await adminSetGameStatus(game.id, next)
      setGames(list)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminPageLayout
      title="จัดการเกม"
      showBack
      onBack={onBack}
      rightLabel="รีเฟรช"
      onRightClick={() => void load()}
    >
      <div className={cn(AD.stack, 'mt-3')}>
        <details className={cn('mx-3', AD.card, AD.body)}>
          <summary className={cn('cursor-pointer', AD.titleMd)}>คำอธิบาย & ตารางรอบออกผล</summary>
          <div className="mt-3 space-y-3 border-t border-[#eee] pt-3">
            <p className={cn(AD.bannerSm, 'bg-[#fff8e1] text-[#5d4037]')}>
              <strong>โมเดลคาสิโน</strong> — เจ้ามือได้เปรียบเสมอ · <strong>อัตโนมัติ</strong>: จำกัดอัตราชนะ ·{' '}
              <strong>กำหนดเอง</strong>: ล็อกผลล่วงหน้า
            </p>
            <p className={cn(AD.bannerSm, 'bg-[#e3f2fd] text-[#1565c0]')}>
              รัน cron{' '}
              <code className="rounded bg-white/60 px-1 text-xs">advance-due-games.mjs</code> ทุก 1 นาที
            </p>
            <ul className="space-y-1.5">
              {GAME_REGISTRY.map((row) => (
                <li key={row.code} className="flex justify-between gap-2 text-sm">
                  <span className="font-mono text-[#888]">{row.code}</span>
                  <span className="text-right">
                    {row.label} ({row.seconds}s)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        {!isAdmin && (
          <p className={cn('mx-3', AD.bannerSm, 'bg-[#fff8e1] text-[#f57c00]')}>
            ตัวแทนดูสถานะได้ — แก้ไขได้เฉพาะผู้ดูแลระบบ
          </p>
        )}

        {loading && (
          <p className="text-center text-base text-[#888]">กำลังโหลดเกม...</p>
        )}

        {error && (
          <p className="mx-3 text-center text-base text-[#ee0a24]">
            {error}
            <button type="button" onClick={() => void load()} className="ml-1 text-[#427ffa]">
              ลองใหม่
            </button>
          </p>
        )}

        {games.length > 0 && (
          <>
            <div className="px-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-[#666]">
                  เลื่อนซ้าย–ขวาเพื่อดูเกม ({activeIndex + 1}/{games.length})
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={activeIndex === 0}
                    onClick={() => scrollByOne(-1)}
                    className="rounded-lg border border-[#ddd] p-1.5 text-[#666] disabled:opacity-40"
                    aria-label="เกมก่อนหน้า"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={activeIndex >= games.length - 1}
                    onClick={() => scrollByOne(1)}
                    className="rounded-lg border border-[#ddd] p-1.5 text-[#666] disabled:opacity-40"
                    aria-label="เกมถัดไป"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div
                ref={pillsRef}
                className="flex gap-2 overflow-x-auto pb-2 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
              >
                {games.map((game, index) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => scrollToGame(index)}
                    className={cn(
                      'shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                      index === activeIndex
                        ? 'bg-[#4e72f3] text-white shadow-sm'
                        : 'bg-white text-[#535867] ring-1 ring-black/10',
                      game.isOverdue && index !== activeIndex && 'ring-[#e65100]/40',
                    )}
                  >
                    {game.name.replace(/^PK10\s?/i, '').slice(0, 12) || game.name}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-3 pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden"
            >
              {games.map((game, index) => {
                const busy = busyId === game.id
                return (
                  <div
                    key={game.id}
                    ref={(el) => {
                      cardRefs.current[index] = el
                    }}
                    data-index={index}
                    className="w-[calc(100vw-2rem)] max-w-md shrink-0 snap-center"
                  >
                    <AdminGameCard
                      game={game}
                      isAdmin={isAdmin}
                      busy={busy}
                      onRefresh={load}
                      onAdvance={() => void handleAdvance(game)}
                      onToggleStatus={() => void handleToggleStatus(game)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center gap-1.5 px-3">
              {games.map((game, index) => (
                <button
                  key={game.id}
                  type="button"
                  aria-label={`ไปเกม ${game.name}`}
                  onClick={() => scrollToGame(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === activeIndex ? 'w-6 bg-[#4e72f3]' : 'w-2 bg-[#d0d3dc]',
                    game.isOverdue && index !== activeIndex && 'bg-[#ffcc80]',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AdminPageLayout>
  )
}
