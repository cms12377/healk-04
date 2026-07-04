import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AD } from '@/admin/adminUi'
import { AdminBadge } from '@/admin/components/AdminBadge'
import { AdminFilterBar, type AdminFilterOption } from '@/admin/components/AdminStatusTabs'
import { AdminPageLayout } from '@/admin/components/AdminPageLayout'
import { getDrawResultHint } from '@/lib/drawResultFormat'
import { formatDrawScheduleTime, localDateTimeToEpoch } from '@/lib/drawScheduleUtils'
import { cn } from '@/lib/utils'
import {
  adminDeleteScheduledDraw,
  adminFetchGames,
  adminGenerateDrawSchedule,
  adminListScheduledDraws,
  adminUpsertScheduledDraw,
} from '@/services/admin'
import type { AdminGameInfo, ScheduledDrawFilter, ScheduledDrawRow } from '@/types'

interface AdminDrawSchedulePageProps {
  onBack: () => void
  initialGameId?: number
}

const FILTER_OPTIONS: AdminFilterOption<ScheduledDrawFilter>[] = [
  { value: 'all', label: 'ทั้งหมด', tone: 'neutral' },
  { value: 'pending', label: 'รอใส่ผล', tone: 'warning' },
  { value: 'filled', label: 'ใส่แล้ว', tone: 'info' },
  { value: 'used', label: 'ใช้แล้ว', tone: 'success' },
]

function statusBadge(row: ScheduledDrawRow) {
  if (row.status === 1) {
    return { label: 'ใช้แล้ว', className: 'bg-[#e8f5e9] text-[#2e7d32]' }
  }
  if (row.status === 2) {
    return { label: 'ยกเลิก', className: 'bg-[#ffebee] text-[#c62828]' }
  }
  if (row.result) {
    return { label: 'พร้อมออก', className: 'bg-[#eef2ff] text-[#4e72f3]' }
  }
  return { label: 'รอใส่ผล', className: 'bg-[#fff8e1] text-[#f57f17]' }
}

function todayInputDate(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function AdminDrawSchedulePage({ onBack, initialGameId }: AdminDrawSchedulePageProps) {
  const [games, setGames] = useState<AdminGameInfo[]>([])
  const [gameId, setGameId] = useState<number | null>(initialGameId ?? null)
  const [rows, setRows] = useState<ScheduledDrawRow[]>([])
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<ScheduledDrawFilter>('all')
  const [rangeDate, setRangeDate] = useState(todayInputDate())
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('21:00')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedGame = games.find((g) => g.id === gameId)
  const hint = getDrawResultHint(selectedGame?.code ?? '')
  const limit = 30

  const rangeEpoch = useMemo(() => {
    try {
      return {
        from: localDateTimeToEpoch(rangeDate, '00:00:00'),
        to: localDateTimeToEpoch(rangeDate, '23:59:59'),
      }
    } catch {
      return { from: undefined, to: undefined }
    }
  }, [rangeDate])

  const loadGames = useCallback(async () => {
    const list = await adminFetchGames()
    setGames(list)
    setGameId((prev) => {
      if (prev && list.some((g) => g.id === prev)) return prev
      const pk5 = list.find((g) => g.code === 'df_pk10_5')
      return pk5?.id ?? list[0]?.id ?? null
    })
  }, [])

  const loadRows = useCallback(async () => {
    if (!gameId) return
    setError('')
    const result = await adminListScheduledDraws({
      gamesId: gameId,
      fromTime: rangeEpoch.from,
      toTime: rangeEpoch.to,
      filter,
      page,
      limit,
    })
    setRows(result.data)
    setTotal(result.total)
    setDrafts((prev) => {
      const next = { ...prev }
      for (const row of result.data) {
        if (next[row.id] === undefined) {
          next[row.id] = row.result ?? ''
        }
      }
      return next
    })
  }, [gameId, rangeEpoch.from, rangeEpoch.to, filter, page])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        await loadGames()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดเกมไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    })()
  }, [loadGames])

  useEffect(() => {
    if (!gameId) return
    void (async () => {
      setBusy(true)
      try {
        await loadRows()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดตารางไม่สำเร็จ')
      } finally {
        setBusy(false)
      }
    })()
  }, [gameId, loadRows])

  const run = async (action: () => Promise<void>, okMsg?: string) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      await loadRows()
      if (okMsg) setMessage(okMsg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = (mode: 'empty' | 'random') => {
    if (!gameId) return
    const start = localDateTimeToEpoch(rangeDate, startTime)
    const end = localDateTimeToEpoch(rangeDate, endTime)
    if (end < start) {
      setError('เวลาสิ้นสุดต้องหลังเวลาเริ่ม')
      return
    }
    void run(async () => {
      const result = await adminGenerateDrawSchedule(gameId, start, end, mode)
      setPage(1)
      if (result.warning === 'no_future_slots_in_range') {
        setError('ช่วงเวลาที่เลือกผ่านไปแล้วทั้งหมด — ตั้งเวลาสิ้นสุดให้หลังเวลาปัจจุบัน')
        return
      }
      const parts = [
        `สร้าง ${result.created} รอบ (ข้าม ${result.skipped})`,
        result.openIssue && `งวดเปิดอยู่: ${result.openIssue}`,
        result.firstIssue && result.lastIssue && `schedule งวด ${result.firstIssue} → ${result.lastIssue}`,
        mode === 'empty' ? 'โหมดช่องว่าง' : 'โหมดสุ่มผล',
      ].filter(Boolean)
      setMessage(parts.join(' · '))
    })
  }

  const handleSaveRow = (row: ScheduledDrawRow) => {
    if (!gameId || row.locked || row.status !== 0) return
    void run(async () => {
      await adminUpsertScheduledDraw({
        gamesId: gameId,
        id: row.id,
        result: (drafts[row.id] ?? '').trim(),
      })
      setMessage(`บันทึกงวด ${row.issue} แล้ว`)
    })
  }

  const handleDeleteRow = (row: ScheduledDrawRow) => {
    if (!window.confirm(`ลบงวด ${row.issue}?`)) return
    void run(async () => {
      await adminDeleteScheduledDraw(row.id)
      setMessage(`ลบงวด ${row.issue} แล้ว`)
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AdminPageLayout
      title="กำหนดผลล่วงหน้า"
      showBack
      onBack={onBack}
      rightLabel="รีเฟรช"
      onRightClick={() => void loadRows()}
    >
      <div className={cn(AD.pagePad, 'space-y-3 pb-8')}>
        <div className="rounded-xl bg-[#eef2ff] px-4 py-3 text-sm text-[#4e72f3]">
          งวดที่ยังไม่ออกผลอยู่ด้านบน · งวดที่ใช้แล้วอยู่ด้านล่าง · รายการใช้แล้วจะถูกลบอัตโนมัติหลัง 1 ชั่วโมง
        </div>

        {error && (
          <p className="rounded-xl bg-[#fff3f3] px-4 py-3 text-sm text-[#ee0a24] whitespace-pre-wrap">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32] whitespace-pre-wrap">
            {message}
          </p>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 space-y-3">
          <label className="block text-xs font-semibold text-[#646566]">เลือกเกม</label>
          <select
            value={gameId ?? ''}
            onChange={(e) => {
              setGameId(Number(e.target.value))
              setPage(1)
            }}
            className={AD.select}
            disabled={loading || busy}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </select>
          {selectedGame && (
            <p className="text-xs text-[#969799]">
              รอบ {selectedGame.cycleLabel ?? '—'} · งวดที่กำลังเปิดรับเดิมพัน{' '}
              <span className="font-mono font-semibold text-[#4e72f3]">
                {selectedGame.issue ?? '—'}
              </span>{' '}
              · schedule จะเริ่มจากงวดนี้ · {hint.hint}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 space-y-3">
          <h2 className="text-sm font-semibold text-[#2c3345]">1) กำหนดช่วงเวลา แล้วสุ่มหรือสร้างช่องว่าง</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[#969799]">วันที่</label>
              <input
                type="date"
                value={rangeDate}
                onChange={(e) => {
                  setRangeDate(e.target.value)
                  setPage(1)
                }}
                className={AD.input}
                disabled={busy}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#969799]">เริ่ม</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={AD.input}
                disabled={busy}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#969799]">ถึง</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={AD.input}
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !gameId}
              onClick={() => handleGenerate('random')}
              className="rounded-lg bg-[#4e72f3] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              สุ่มผลล่วงหน้าทั้งช่วง
            </button>
            <button
              type="button"
              disabled={busy || !gameId}
              onClick={() => handleGenerate('empty')}
              className="rounded-lg border border-[#4e72f3] px-3 py-2 text-xs font-semibold text-[#4e72f3] disabled:opacity-50"
            >
              สร้างช่องว่าง (ใส่ผลทีหลัง)
            </button>
          </div>
          <p className="text-[11px] text-[#969799]">
            สุ่มแล้วแก้ไขได้ในตาราง — งวดที่มีเดิมพันหรือออกผลแล้วจะล็อกไม่ให้แก้
          </p>
        </div>

        <AdminFilterBar
          label="กรองตาราง"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => {
            setFilter(v)
            setPage(1)
          }}
          summary={`${total} รอบ · หน้า ${page}/${totalPages}`}
          className="mx-0"
        />

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <h2 className="border-b border-[#eee] px-4 py-3 text-sm font-semibold text-[#2c3345]">
            2) ตารางงวด — รอออกอยู่บน · ใช้แล้วอยู่ล่าง
          </h2>

          {loading ? (
            <p className="py-10 text-center text-sm text-[#888]">กำลังโหลด...</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#888]">
              ไม่มีงวดในวันที่เลือก — สุ่มผลหรือสร้างช่องว่างจากช่วงเวลาด้านบน
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#f8f9fa] text-[#969799]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">งวด</th>
                    <th className="px-3 py-2 font-semibold">เวลาออกผล</th>
                    <th className="px-3 py-2 font-semibold">ผล (แก้ไขได้)</th>
                    <th className="px-3 py-2 font-semibold">สถานะ</th>
                    <th className="px-3 py-2 font-semibold">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const badge = statusBadge(row)
                    const editable = row.status === 0 && !row.locked
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-t border-[#f0f0f0]',
                          row.status === 1 && 'bg-[#fafafa] text-[#969799]',
                        )}
                      >
                        <td className="px-3 py-2 font-mono font-semibold text-[#2c3345]">
                          {row.issue}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums text-[#646566]">
                          {formatDrawScheduleTime(row.drawTime)}
                        </td>
                        <td className="px-3 py-2">
                          {editable ? (
                            <input
                              value={drafts[row.id] ?? ''}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                              }
                              placeholder={hint.example}
                              className="w-full min-w-[200px] rounded-lg border border-[#ddd] px-2 py-1.5 font-mono text-xs outline-none focus:border-[#427ffa]"
                              disabled={busy}
                            />
                          ) : (
                            <span className="font-mono text-[#646566]">{row.result ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <AdminBadge label={badge.label} className={cn('px-2 py-0.5', badge.className)} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {editable && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleSaveRow(row)}
                                  className="rounded-md bg-[#4e72f3] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                                >
                                  บันทึก
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeleteRow(row)}
                                  className="rounded-md border border-[#ffcdd2] p-1 text-[#c62828] disabled:opacity-50"
                                  aria-label="ลบ"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-[#eee] py-3">
              <button
                type="button"
                disabled={page <= 1 || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#ebedf0] p-2 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs tabular-nums text-[#646566]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || busy}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[#ebedf0] p-2 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  )
}
