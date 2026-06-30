import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { PageNavBar } from '@/components/common/PageNavBar'
import {
  adminAdvanceGame,
  adminFetchGames,
  adminSetDrawMode,
  adminSetGameStatus,
  adminSetNextDrawResult,
  adminTickGameCountdowns,
  type AdminGameInfo,
} from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import { drawModeLabel, getDrawResultHint } from '@/lib/drawResultFormat'
import { formatCountdownMmSs } from '@/lib/gameIntervals'
import { cn } from '@/lib/utils'

interface AdminGamesPageProps {
  onBack: () => void
}

const CYCLE_REFERENCE: { code: string; label: string; seconds: number }[] = [
  { code: 'df_pk10', label: '10 นาที', seconds: 600 },
  { code: 'df_pk10_3', label: '3 นาที', seconds: 180 },
  { code: 'df_pk10_5', label: '5 นาที', seconds: 300 },
  { code: 'df_k3', label: '1 นาที', seconds: 60 },
  { code: 'xam_6', label: '5 นาที', seconds: 300 },
  { code: 'xy_28', label: '5 นาที', seconds: 300 },
  { code: 'df_ssc', label: '1 นาที', seconds: 60 },
]

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
  const hint = getDrawResultHint(game.code)
  const needsPreset =
    game.drawMode === 'manual' && !game.nextDrawResult && (game.secondsLeft ?? 999) <= 120

  useEffect(() => {
    setPreset(game.nextDrawResult ?? '')
  }, [game.nextDrawResult, game.id])

  const handleModeChange = async (mode: 'random' | 'manual') => {
    if (game.drawMode === mode) return
    const msg =
      mode === 'random'
        ? `เปลี่ยน ${game.name} เป็นโหมดสุ่มอัตโนมัติ?\nระบบออกผลเอง — อัตราชนะเฉลี่ย ~30% ต่องวด (แพ้ ~70%)`
        : `เปลี่ยน ${game.name} เป็นโหมดกำหนดเอง?\nต้องตั้งผลก่อนหมดเวลาทุกงวด — ไม่จำกัดอัตราชนะ`
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

  return (
    <div className="mt-3 space-y-2 border-t border-[#eee] pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#666]">โหมดออกผล</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            game.drawMode === 'manual'
              ? 'bg-[#fff3e0] text-[#e65100]'
              : 'bg-[#e8f5e9] text-[#2e7d32]',
          )}
        >
          {drawModeLabel(game.drawMode)}
        </span>
      </div>

      {needsPreset && (
        <p className="flex items-start gap-1.5 rounded-lg bg-[#fff3e0] px-2.5 py-2 text-[11px] text-[#e65100]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          โหมดกำหนดเอง — ยังไม่มีผลสำหรับงวด {game.issue ?? '—'} ระบบจะไม่ออกผลจนกว่าจะตั้งค่า
        </p>
      )}

      {isAdmin && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || game.drawMode === 'random'}
              onClick={() => void handleModeChange('random')}
              className={cn(
                'flex-1 rounded-full py-1.5 text-[11px] font-medium',
                game.drawMode === 'random'
                  ? 'bg-[#2e7d32] text-white'
                  : 'border border-[#ddd] text-[#666]',
              )}
            >
              สุ่มอัตโนมัติ
            </button>
            <button
              type="button"
              disabled={busy || game.drawMode === 'manual'}
              onClick={() => void handleModeChange('manual')}
              className={cn(
                'flex-1 rounded-full py-1.5 text-[11px] font-medium',
                game.drawMode === 'manual'
                  ? 'bg-[#e65100] text-white'
                  : 'border border-[#ddd] text-[#666]',
              )}
            >
              กำหนดเอง
            </button>
          </div>

          {game.drawMode === 'manual' && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-[#888]">
                ผลงวดถัดไป {game.issue ? `(งวด ${game.issue})` : ''}
              </p>
              <p className="text-[10px] text-[#aaa]">{hint.hint}</p>
              <input
                type="text"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                placeholder={hint.example}
                disabled={busy}
                className="w-full rounded border border-[#ddd] px-2.5 py-2 font-mono text-xs outline-none focus:border-[#427ffa]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSavePreset()}
                  className="flex-1 rounded-full bg-[#5f97ff] py-2 text-[11px] font-semibold text-white"
                >
                  บันทึกผล
                </button>
                {game.nextDrawResult && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleClearPreset()}
                    className="rounded-full border border-[#ddd] px-3 py-2 text-[11px] text-[#666]"
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
    <div className="min-h-dvh bg-[#f5f5f5] pb-8 pt-[60px]">
      <div className="fixed top-0 z-[1000] w-full">
        <PageNavBar
          title="จัดการเกม"
          showBack
          onBack={onBack}
          rightLabel="รีเฟรช"
          onRightClick={() => void load()}
        />
      </div>

      <div className="mx-2.5 mt-3 space-y-3">
        <p className="rounded-lg bg-[#e3f2fd] px-3 py-2 text-xs text-[#1565c0]">
          <strong>สุ่มอัตโนมัติ</strong> — ออกผลเอง + ควบคุมให้ชนะ ~30% / แพ้ ~70% ต่องวด &nbsp;|&nbsp;{' '}
          <strong>กำหนดเอง</strong> — ผู้ดูแลกำหนดผลเอง (ไม่จำกัดอัตราชนะ)
        </p>

        <details className="rounded-lg bg-white px-3 py-2 text-xs text-[#666] shadow-sm ring-1 ring-black/5">
          <summary className="cursor-pointer font-medium text-[#333]">
            ตารางรอบออกผลทั้ง 7 เกม (ตรงกับหน้าเกมสมาชิก)
          </summary>
          <ul className="mt-2 space-y-1 border-t border-[#eee] pt-2">
            {CYCLE_REFERENCE.map((row) => (
              <li key={row.code} className="flex justify-between gap-2">
                <span className="font-mono text-[#888]">{row.code}</span>
                <span>
                  {row.label}/งวด ({row.seconds}s)
                </span>
              </li>
            ))}
          </ul>
        </details>

        {!isAdmin && (
          <p className="rounded-lg bg-[#fff8e1] px-3 py-2 text-xs text-[#f57c00]">
            ตัวแทนดูสถานะได้ — เปลี่ยนโหมด/ตั้งผล/บังคับออกผล ได้เฉพาะผู้ดูแลระบบ
          </p>
        )}

        {loading && (
          <p className="text-center text-sm text-[#888]">กำลังโหลดเกม...</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#ee0a24]">
            {error}
            <button type="button" onClick={() => void load()} className="ml-1 text-[#427ffa]">
              ลองใหม่
            </button>
          </p>
        )}

        {games.map((game) => {
          const busy = busyId === game.id
          return (
            <div
              key={game.id}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#333]">{game.name}</p>
                  <p className="text-xs text-[#888]">
                    {game.code} · {game.gameType}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    game.status === 1
                      ? 'bg-[#e8f5e9] text-[#2e7d32]'
                      : 'bg-[#ffebee] text-[#c62828]',
                  )}
                >
                  {game.status === 1 ? 'เปิด' : 'ปิด'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-[#f8f9fa] px-2 py-1.5">
                  <span className="text-[#888]">รอบ/งวด</span>
                  <p className="font-medium text-[#333]">
                    {game.cycleLabel ?? '—'}
                  </p>
                </div>
                <div className="rounded bg-[#f8f9fa] px-2 py-1.5">
                  <span className="text-[#888]">งวดปัจจุบัน</span>
                  <p className="font-medium text-[#333]">{game.issue ?? '—'}</p>
                </div>
                <div className="rounded bg-[#f8f9fa] px-2 py-1.5">
                  <span className="text-[#888]">นับถอยหลัง</span>
                  <p
                    className={cn(
                      'font-medium tabular-nums',
                      game.isOverdue ? 'text-[#e65100]' : 'text-[#427ffa]',
                    )}
                  >
                    {formatCountdownMmSs(game.secondsLeft)}
                  </p>
                  {game.isOverdue && (
                    <p className="text-[10px] text-[#e65100]">ถึงเวลาออกผลแล้ว</p>
                  )}
                </div>
                <div className="col-span-2 rounded bg-[#f8f9fa] px-2 py-1.5">
                  <span className="text-[#888]">ผลล่าสุด</span>
                  <p className="font-medium text-[#333]">
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
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !game.issue}
                    onClick={() => void handleAdvance(game)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#5f97ff] py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
                    บังคับออกผล
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggleStatus(game)}
                    className="rounded-full border border-[#ddd] px-3 py-2 text-xs font-medium text-[#666]"
                  >
                    {game.status === 1 ? 'ปิดเกม' : 'เปิดเกม'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
