/** Round length per game (seconds) — aligned with th6688 game names */
export const GAME_CYCLE_SECONDS: Record<string, number> = {
  df_pk10: 600,
  df_pk10_3: 180,
  df_pk10_5: 300,
  df_k3: 180,
  xam_6: 600,
  xy_28: 180,
  df_ssc: 300,
}

const DEFAULT_CYCLE = 600

/** Roll stale draw_time forward so countdown always has a future deadline */
export function resolveDrawDeadline(
  drawTime: number,
  gameCode: string,
  now = Math.floor(Date.now() / 1000),
): number {
  const cycle = GAME_CYCLE_SECONDS[gameCode] ?? DEFAULT_CYCLE
  if (drawTime > now) return drawTime
  let deadline = drawTime
  while (deadline <= now) deadline += cycle
  return deadline
}

export function secondsUntilDraw(
  drawTime: number,
  gameCode: string,
  now = Math.floor(Date.now() / 1000),
): number {
  return Math.max(0, resolveDrawDeadline(drawTime, gameCode, now) - now)
}

export function formatCountdown(totalSeconds: number): {
  hours: string
  minutes: string
  seconds: string
} {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
  }
}
