import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
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
    <div className="mt-4 space-y-3 border-t border-[#eee] pt-4">
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
          โหมดกำหนดเอง — ยังไม่มีผลสำหรับงวด {game.issue ?? '—'} ระบบจะไม่ออกผลจนกว่าจะตั้งค่า
        </p>
      )}

      {isAdmin && (
        <>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy || game.drawMode === 'random'}
              onClick={() => void handleModeChange('random')}
              className={cn(
                AD.btnSm,
                'flex-1',
                game.drawMode === 'random'
                  ? 'bg-[#2e7d32] text-white'
                  : 'border-2 border-[#ddd] text-[#666]',
              )}
            >
              คาสิโน (อัตโนมัติ)
            </button>
            <button
              type="button"
              disabled={busy || game.drawMode === 'manual'}
              onClick={() => void handleModeChange('manual')}
              className={cn(
                AD.btnSm,
                'flex-1',
                game.drawMode === 'manual'
                  ? 'bg-[#e65100] text-white'
                  : 'border-2 border-[#ddd] text-[#666]',
              )}
            >
              กำหนดผลเอง
            </button>
          </div>

          {game.drawMode === 'random' && (
            <div className="space-y-2 rounded-xl bg-[#f1f8e9] px-4 py-3">
              <p className="text-base font-medium text-[#33691e]">
                โหมดคาสิโน — ระบบเลือกผลให้เจ้ามือได้เปรียบ
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className={cn('shrink-0', AD.label)}>สมาชิกชนะ</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={winRatePct}
                  onChange={(e) => setWinRatePct(Number(e.target.value))}
                  disabled={busy}
                  className="w-20 rounded-xl border border-[#ddd] px-3 py-2 text-center text-base"
                />
                <span className={AD.hint}>
                  % → เจ้ามือ ~{Math.max(0, 100 - winRatePct)}%
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveWinRate()}
                  className={cn(AD.btnSm, 'ml-auto bg-[#2e7d32] text-white')}
                >
                  บันทึก
                </button>
              </div>
            </div>
          )}

          {game.drawMode === 'manual' && (
            <div className="space-y-2">
              <p className={AD.hint}>
                ผลงวดถัดไป {game.issue ? `(งวด ${game.issue})` : ''}
              </p>
              <p className="text-sm text-[#aaa]">{hint.hint}</p>
              <input
                type="text"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                placeholder={hint.example}
                disabled={busy}
                className={cn(AD.input, 'font-mono')}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSavePreset()}
                  className={cn(AD.btnSm, 'flex-1 bg-[#5f97ff] text-white')}
                >
                  บันทึกผล
                </button>
                {game.nextDrawResult && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleClearPreset()}
                    className={cn(AD.btnSm, 'border-2 border-[#ddd] text-[#666]')}
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

export function AdminGamesPage({ onBack }: AdminGamesPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [games, setGames] = useState<AdminGameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

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
      <div className={cn(AD.pagePad, AD.stack)}>
        <p className={cn(AD.banner, 'bg-[#fff8e1] text-[#5d4037]')}>
          <strong>โมเดลคาสิโน</strong> — เจ้ามือ (ผู้ดูแล) ได้เปรียบเสมอ &nbsp;|&nbsp;{' '}
          <strong>อัตโนมัติ</strong>: ระบบออกผลโดยจำกัดอัตราชนะสมาชิก &nbsp;|&nbsp;{' '}
          <strong>กำหนดเอง</strong>: ล็อกผลล่วงหน้าทุกงวด
        </p>

        <p className={cn(AD.banner, 'bg-[#e3f2fd] text-[#1565c0]')}>
          แต่ละเกมมีรอบออกผลต่างกัน (1–10 นาที) — ดูตารางด้านล่าง &nbsp;|&nbsp; รัน{' '}
          <code className="rounded bg-white/60 px-1.5 py-0.5 text-sm">node scripts/advance-due-games.mjs</code>{' '}
          ทุก 1 นาที
        </p>

        <details className={cn(AD.card, AD.body)}>
          <summary className={cn('cursor-pointer', AD.titleMd)}>
            ตารางรอบออกผลทั้ง 7 เกม (ตรงกับหน้าเกมสมาชิก)
          </summary>
          <ul className="mt-3 space-y-2 border-t border-[#eee] pt-3">
            {GAME_REGISTRY.map((row) => (
              <li key={row.code} className="flex justify-between gap-3">
                <span className="font-mono text-[#888]">{row.code}</span>
                <span>
                  {row.label}/งวด ({row.seconds}s) · #{row.path}
                </span>
              </li>
            ))}
          </ul>
        </details>

        {!isAdmin && (
          <p className={cn(AD.bannerSm, 'bg-[#fff8e1] text-[#f57c00]')}>
            ตัวแทนดูสถานะได้ — เปลี่ยนโหมด/ตั้งผล/บังคับออกผล ได้เฉพาะผู้ดูแลระบบ
          </p>
        )}

        {loading && (
          <p className="text-center text-base text-[#888]">กำลังโหลดเกม...</p>
        )}

        {error && (
          <p className="text-center text-base text-[#ee0a24]">
            {error}
            <button type="button" onClick={() => void load()} className="ml-1 text-[#427ffa]">
              ลองใหม่
            </button>
          </p>
        )}

        {games.map((game) => {
          const busy = busyId === game.id
          return (
            <div key={game.id} className={AD.card}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={AD.titleMd}>{game.name}</p>
                  <p className={cn('mt-1', AD.hint)}>
                    {game.code} · {game.gameType} · {game.cycleLabel ?? '—'}/งวด
                  </p>
                </div>
                <span
                  className={cn(
                    AD.badge,
                    game.status === 1
                      ? 'bg-[#e8f5e9] text-[#2e7d32]'
                      : 'bg-[#ffebee] text-[#c62828]',
                  )}
                >
                  {game.status === 1 ? 'เปิด' : 'ปิด'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className={AD.cardInner}>
                  <span className={AD.label}>รอบ/งวด</span>
                  <p className={cn('mt-1', AD.value)}>
                    {game.cycleLabel ?? '—'}
                  </p>
                </div>
                <div className={AD.cardInner}>
                  <span className={AD.label}>งวดปัจจุบัน</span>
                  <p className={cn('mt-1', AD.value)}>{game.issue ?? '—'}</p>
                </div>
                <div className={AD.cardInner}>
                  <span className={AD.label}>นับถอยหลัง</span>
                  <p
                    className={cn(
                      'mt-1 text-lg font-semibold tabular-nums',
                      game.isOverdue ? 'text-[#e65100]' : 'text-[#427ffa]',
                    )}
                  >
                    {formatCountdownMmSs(game.secondsLeft)}
                  </p>
                  {game.isOverdue && (
                    <p className="mt-1 text-sm text-[#e65100]">
                      ถึงเวลาออกผล — รอ advance หรือเปิดหน้าเกมสมาชิก
                    </p>
                  )}
                </div>
                <div className={cn('col-span-3 rounded-xl bg-[#f0f7ff] px-4 py-3 text-sm text-[#427ffa]')}>
                  หน้าสมาชิก:{' '}
                  <span className="font-mono break-all">{memberGameHash(game.code, game.id)}</span>
                </div>
                <div className={cn('col-span-3', AD.cardInner)}>
                  <span className={AD.label}>ผลล่าสุด</span>
                  <p className={cn('mt-1', AD.value)}>
                    {game.lastIssue
                      ? `${game.lastIssue}: ${game.lastResult ?? '—'}`
                      : '—'}
                  </p>
                </div>
              </div>

              <GameDrawControls
                game={game}
                isAdmin={isAdmin}
                busy={busy}
                onRefresh={load}
              />

              {isAdmin && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={busy || !game.issue}
                    onClick={() => void handleAdvance(game)}
                    className={cn(
                      AD.btnSm,
                      'flex flex-1 items-center justify-center gap-2 bg-[#5f97ff] text-white disabled:opacity-50',
                    )}
                  >
                    <RefreshCw className={cn('h-5 w-5', busy && 'animate-spin')} />
                    บังคับออกผล
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggleStatus(game)}
                    className={cn(AD.btnSm, 'border-2 border-[#ddd] text-[#666]')}
                  >
                    {game.status === 1 ? 'ปิดเกม' : 'เปิดเกม'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AdminPageLayout>
  )
}
