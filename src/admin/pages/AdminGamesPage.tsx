import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminBadge } from '@/admin/components/AdminBadge'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import {
  adminAdvanceGame,
  adminFetchGames,
  adminSetDrawMode,
  adminSetGameStatus,
  adminSetNextDrawResult,
  adminTickGameCountdowns,
} from '@/services/admin'
import { useAuth } from '@/context/AuthContext'
import {
  drawModeDescription,
  drawModeLabel,
  getDrawResultHint,
  type DrawMode,
} from '@/lib/drawResultFormat'
import { formatCountdownMmSs } from '@/lib/gameIntervals'
import { cn } from '@/lib/utils'
import type { AdminAdvanceResult, AdminGameInfo } from '@/types'

interface AdminGamesPageProps {
  onBack: () => void
}

function statusLabel(status: number): string {
  return status === 1 ? 'เปิด' : 'ปิด'
}

function statusClass(status: number): string {
  return status === 1 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'
}

export function AdminGamesPage({ onBack }: AdminGamesPageProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [games, setGames] = useState<AdminGameInfo[]>([])
  const [draftResults, setDraftResults] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const list = await adminFetchGames()
      setGames(list)
      setDraftResults((prev) => {
        const next = { ...prev }
        for (const g of list) {
          if (next[g.id] === undefined) {
            next[g.id] = g.nextDrawResult ?? ''
          }
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดเกมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGames((prev) => adminTickGameCountdowns(prev))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const applyGames = (list: AdminGameInfo[]) => {
    setGames(list)
    setDraftResults((prev) => {
      const next = { ...prev }
      for (const g of list) {
        next[g.id] = g.nextDrawResult ?? ''
      }
      return next
    })
  }

  const runAction = async (gameId: number, action: () => Promise<AdminGameInfo[]>) => {
    setBusyId(gameId)
    setError('')
    try {
      applyGames(await action())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  const runAdvance = async (game: AdminGameInfo) => {
    if (
      !window.confirm(
        `บังคับออกผลทันที?\n${game.name} — งวด ${game.issue ?? '—'}\nจะตัดรอบและ settle เดิมพัน`,
      )
    ) {
      return
    }
    setBusyId(game.id)
    setError('')
    try {
      const result: AdminAdvanceResult = await adminAdvanceGame(game.id)
      if (result.skipped) {
        alert(result.reason ?? 'ข้ามการออกผล')
      } else {
        alert(
          [
            result.drawnIssue && `งวด: ${result.drawnIssue}`,
            result.result && `ผล: ${result.result}`,
            result.settled != null && ` settle: ${result.settled} รายการ`,
            result.newIssue && `งวดใหม่: ${result.newIssue}`,
          ]
            .filter(Boolean)
            .join('\n'),
        )
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ออกผลไม่สำเร็จ')
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
      <div className={cn(AD.pagePad, 'space-y-3')}>
        <div className="rounded-xl bg-[#eef2ff] px-4 py-3 text-sm text-[#4e72f3]">
          {isAdmin
            ? 'เปิด/ปิดเกม กำหนดโหมดออกผล (สุ่ม/มือ) ตั้งผลรอบถัดไป หรือบังคับออกผลทันที — สมาชิกเห็นผลบนหน้าเดิมพันทันที'
            : 'ตัวแทนดูสถานะเกมได้อย่างเดียว — การแก้ไขทำได้เฉพาะผู้ดูแลระบบ'}
        </div>

        {error && (
          <p className="rounded-xl bg-[#fff3f3] px-4 py-3 text-center text-sm text-[#ee0a24]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-[#888]">กำลังโหลดเกม...</p>
        ) : games.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#888]">ไม่พบเกมในระบบ</p>
        ) : (
          games.map((game) => {
            const hint = getDrawResultHint(game.code)
            const busy = busyId === game.id
            const countdown =
              game.secondsLeft != null ? formatCountdownMmSs(game.secondsLeft) : '—'

            return (
              <div
                key={game.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-[#2c3345]">{game.name}</h2>
                    <p className="mt-0.5 font-mono text-xs text-[#969799]">{game.code}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <AdminBadge
                      label={statusLabel(game.status)}
                      className={cn('px-2.5 py-0.5 text-xs', statusClass(game.status))}
                    />
                    <span className="rounded-full bg-[#f5f5f9] px-2.5 py-0.5 text-xs font-semibold text-[#646566]">
                      {drawModeLabel(game.drawMode)}
                    </span>
                    {game.isOverdue && (
                      <AdminBadge
                        label="ค้างออกผล"
                        className="animate-pulse px-2.5 py-0.5 text-xs bg-[#fff3e0] text-[#e65100]"
                      />
                    )}
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[#969799]">งวดปัจจุบัน</dt>
                    <dd className="font-mono font-semibold text-[#2c3345]">{game.issue ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#969799]">นับถอยหลัง</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[#4e72f3]">
                      {countdown}
                      {game.cycleLabel ? (
                        <span className="ml-1 font-sans font-normal text-[#969799]">
                          ({game.cycleLabel})
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#969799]">งวดล่าสุด</dt>
                    <dd className="font-mono text-[#646566]">{game.lastIssue ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#969799]">ผลล่าสุด</dt>
                    <dd className="break-all font-mono text-[#646566]">{game.lastResult ?? '—'}</dd>
                  </div>
                </dl>

                {game.nextDrawResult && (
                  <p className="mt-2 rounded-lg bg-[#fff8e1] px-3 py-2 text-xs text-[#f57f17]">
                    ผลที่ตั้งไว้รอบถัดไป:{' '}
                    <span className="font-mono font-semibold">{game.nextDrawResult}</span>
                  </p>
                )}

                <p className="mt-2 text-xs text-[#969799]">{drawModeDescription(game.drawMode)}</p>

                {isAdmin && (
                  <div className="mt-4 space-y-3 border-t border-[#eee] pt-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(game.id, () =>
                            adminSetGameStatus(game.id, game.status === 1 ? 0 : 1),
                          )
                        }
                        className="rounded-lg border border-[#ebedf0] px-3 py-1.5 text-xs font-semibold text-[#535867] disabled:opacity-50"
                      >
                        {game.status === 1 ? 'ปิดเกม' : 'เปิดเกม'}
                      </button>
                      {(['random', 'manual'] as DrawMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          disabled={busy || game.drawMode === mode}
                          onClick={() =>
                            void runAction(game.id, () => adminSetDrawMode(game.id, mode))
                          }
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50',
                            game.drawMode === mode
                              ? 'bg-[#4e72f3] text-white'
                              : 'border border-[#ebedf0] text-[#535867]',
                          )}
                        >
                          {drawModeLabel(mode)}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAdvance(game)}
                        className="rounded-lg bg-[#e65100] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busy ? '...' : 'ออกผลทันที'}
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#646566]">
                        กำหนดผลรอบถัดไป (manual)
                      </label>
                      <p className="mb-1.5 text-[11px] text-[#969799]">{hint.hint}</p>
                      <input
                        value={draftResults[game.id] ?? ''}
                        onChange={(e) =>
                          setDraftResults((prev) => ({ ...prev, [game.id]: e.target.value }))
                        }
                        placeholder={hint.example || 'เช่น 1,2,3'}
                        disabled={busy}
                        className={cn(
                          AD.input,
                          'font-mono text-sm disabled:opacity-50',
                        )}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction(game.id, () =>
                              adminSetNextDrawResult(
                                game.id,
                                (draftResults[game.id] ?? '').trim(),
                              ),
                            )
                          }
                          className="rounded-lg bg-[#4e72f3] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          บันทึกผล
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction(game.id, () => adminSetNextDrawResult(game.id, ''))
                          }
                          className="rounded-lg border border-[#ebedf0] px-3 py-1.5 text-xs font-semibold text-[#535867] disabled:opacity-50"
                        >
                          ล้างผลที่ตั้ง
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {!loading && (
          <button
            type="button"
            onClick={() => void load()}
            className="mx-auto flex items-center gap-1.5 text-sm text-[#4e72f3]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            โหลดใหม่จากเซิร์ฟเวอร์
          </button>
        )}
      </div>
    </AdminPageLayout>
  )
}
