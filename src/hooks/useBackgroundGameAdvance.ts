import { useEffect } from 'react'
import { syncDueGames } from '@/services/gameSync'

/** When any member has the app open, nudge overdue rounds (backup for cron). */
export function useBackgroundGameAdvance(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      void syncDueGames().catch(() => null)
    }

    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [enabled])
}
