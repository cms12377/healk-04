import { useEffect, useRef } from 'react'
import { requireSupabase } from '@/lib/supabase'

/** Refresh admin games list when any round advances (realtime + tab focus). */
export function useAdminGamesRealtime(onSync: () => void | Promise<void>, enabled = true) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useEffect(() => {
    if (!enabled) return

    const run = () => void onSyncRef.current()

    let client
    try {
      client = requireSupabase()
    } catch {
      return
    }

    const channel = client
      .channel('admin-games-rounds')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draw_results' },
        run,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_issues' },
        run,
      )
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void client.removeChannel(channel)
    }
  }, [enabled])
}
