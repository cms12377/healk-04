/**
 * Round length (seconds) verified against th6688 / laoadmin.top `current_game` API (2026-06-29).
 * Countdown UI on th6688 is MM:SS only (no hours) — all cycles are under 1 hour.
 */
export const GAME_CYCLE_SECONDS: Record<string, number> = {
  df_pk10: 600, // PK10 10 นาที
  df_pk10_3: 180, // PK10 3 นาที
  df_pk10_5: 300, // PK10 5 นาที
  df_k3: 60, // 快3 — ~1 นาที/งวด (live API)
  xam_6: 300, // 六合彩 — 5 นาที (simulated; live API unavailable)
  xy_28: 300, // 幸运28 — 5 นาที (live API, same cadence as pk10_5)
  df_ssc: 60, // 时时彩 — ~1 นาที/งวด (live API)
}

export const GAME_CYCLE_LABEL: Record<string, string> = {
  df_pk10: '10 นาที',
  df_pk10_3: '3 นาที',
  df_pk10_5: '5 นาที',
  df_k3: '1 นาที',
  xam_6: '5 นาที',
  xy_28: '5 นาที',
  df_ssc: '1 นาที',
}

/** Seal betting N seconds before draw_time (from laoadmin.top games API `cutoff`) */
export const GAME_CUTOFF_SECONDS: Record<string, number> = {
  df_pk10: 5,
  df_pk10_3: 5,
  df_pk10_5: 5,
  df_k3: 0,
  xam_6: 5,
  xy_28: 5,
  df_ssc: 0,
}

/** Single source of truth — member routes + admin cycle table */
export const GAME_REGISTRY = [
  { code: 'df_pk10', label: '10 นาที', seconds: 600, path: 'pkShi', name: 'PK10 10 นาที' },
  { code: 'df_pk10_3', label: '3 นาที', seconds: 180, path: 'pkShi', name: 'PK10 3 นาที' },
  { code: 'df_pk10_5', label: '5 นาที', seconds: 300, path: 'pkShi', name: 'PK10 5 นาที' },
  { code: 'df_k3', label: '1 นาที', seconds: 60, path: 'kuaisan', name: 'K3' },
  { code: 'xam_6', label: '5 นาที', seconds: 300, path: 'aoLiu', name: 'Mark Six' },
  { code: 'xy_28', label: '5 นาที', seconds: 300, path: 'xingyun', name: 'Lucky 28' },
  { code: 'df_ssc', label: '1 นาที', seconds: 60, path: 'shiShiCai', name: 'หวยรัฐบาล' },
] as const

export type GameRegistryCode = (typeof GAME_REGISTRY)[number]['code']

export const ALL_GAME_CODES = GAME_REGISTRY.map((g) => g.code)

const DEFAULT_CYCLE = 600

export function getGameCycleSeconds(gameCode: string): number {
  return GAME_CYCLE_SECONDS[gameCode] ?? DEFAULT_CYCLE
}

export function getGameCutoffSeconds(gameCode: string): number {
  return GAME_CUTOFF_SECONDS[gameCode] ?? 5
}

/** Raw seconds until draw_time (0 when overdue — th6688 server advances instead of faking countdown). */
export function secondsUntilDraw(
  drawTime: number,
  _gameCode?: string,
  now = Math.floor(Date.now() / 1000),
): number {
  return Math.max(0, drawTime - now)
}

/** True when betting should be sealed (matches th6688 cutoff before draw). */
export function isBettingClosed(
  drawTime: number,
  gameCode: string,
  now = Math.floor(Date.now() / 1000),
): boolean {
  const left = secondsUntilDraw(drawTime, gameCode, now)
  return left <= getGameCutoffSeconds(gameCode)
}

/** th6688 van-count-down: minutes + seconds only (MM:SS) */
export function formatCountdown(totalSeconds: number): {
  minutes: string
  seconds: string
} {
  const safe = Math.max(0, totalSeconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return {
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
  }
}

export function formatCountdownMmSs(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return '—'
  const { minutes, seconds } = formatCountdown(totalSeconds)
  return `${minutes}:${seconds}`
}

export function getGameCycleLabel(gameCode: string): string {
  return GAME_CYCLE_LABEL[gameCode] ?? `${Math.round(getGameCycleSeconds(gameCode) / 60)} นาที`
}

/** Shared countdown state for member game page + admin panel */
export function resolveGameCountdown(
  drawTime: number | undefined,
  gameCode: string,
  now = Math.floor(Date.now() / 1000),
) {
  const cycleSeconds = getGameCycleSeconds(gameCode)
  const cycleLabel = getGameCycleLabel(gameCode)
  if (drawTime == null) {
    return { secondsLeft: null as number | null, cycleSeconds, cycleLabel, isOverdue: false }
  }
  const isOverdue = drawTime <= now
  const secondsLeft = secondsUntilDraw(drawTime, gameCode, now)
  return {
    secondsLeft,
    cycleSeconds,
    cycleLabel,
    isOverdue,
    cutoffSeconds: getGameCutoffSeconds(gameCode),
    bettingClosed: isBettingClosed(drawTime, gameCode, now),
  }
}

/** Delay before auto-advance when countdown hits zero (shorter for 1-min games) */
export function getAdvanceRefreshDelayMs(gameCode: string): number {
  return getGameCycleSeconds(gameCode) <= 60 ? 1500 : 5000
}
