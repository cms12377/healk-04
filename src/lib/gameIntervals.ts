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

const DEFAULT_CYCLE = 600

export function getGameCycleSeconds(gameCode: string): number {
  return GAME_CYCLE_SECONDS[gameCode] ?? DEFAULT_CYCLE
}

/** When DB draw_time is stale, start a fresh full round (matches th6688 server refresh). */
export function resolveDrawDeadline(
  drawTime: number,
  gameCode: string,
  now = Math.floor(Date.now() / 1000),
): number {
  const cycle = getGameCycleSeconds(gameCode)
  if (drawTime > now) return drawTime
  return now + cycle
}

export function secondsUntilDraw(
  drawTime: number,
  gameCode: string,
  now = Math.floor(Date.now() / 1000),
): number {
  return Math.max(0, resolveDrawDeadline(drawTime, gameCode, now) - now)
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
