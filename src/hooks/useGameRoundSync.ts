import { useCallback, useEffect, useRef } from 'react'
import { getGameCutoffSeconds, secondsUntilDraw } from '@/lib/gameIntervals'
import { requireSupabase } from '@/lib/supabase'

interface UseGameRoundSyncOptions {
  gamesId: number | null | undefined
  gameCode: string
  rawDrawTime: number
  onSync: () => void | Promise<void>
  enabled?: boolean
}

/**
 * Keeps game round UI in sync when countdown ends — polling + Supabase Realtime.
 * Without this, members had to reload after draw_time passed.
 */
export function useGameRoundSync({
  gamesId,
  gameCode,
  rawDrawTime,
  onSync,
  enabled = true,
}: UseGameRoundSyncOptions) {
  const syncingRef = useRef(false)
  const pollRef = useRef<number | null>(null)
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  const sync = useCallback(async () => {
    if (!enabled || !gamesId || syncingRef.current) return
    syncingRef.current = true
    try {
      await onSyncRef.current()
    } finally {
      syncingRef.current = false
    }
  }, [enabled, gamesId])

  useEffect(() => {
    if (!enabled || !gamesId || !rawDrawTime || !gameCode) return

    const clearPoll = () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    const evaluate = () => {
      const left = secondsUntilDraw(rawDrawTime, gameCode)
      const nearDraw = left <= getGameCutoffSeconds(gameCode) + 3

      if (!nearDraw) {
        clearPoll()
        return
      }

      if (pollRef.current == null) {
        void sync()
        pollRef.current = window.setInterval(() => {
          void sync()
        }, 2000)
      }
    }

    evaluate()
    const tick = window.setInterval(evaluate, 1000)
    return () => {
      window.clearInterval(tick)
      clearPoll()
    }
  }, [enabled, gamesId, gameCode, rawDrawTime, sync])

  useEffect(() => {
    if (!enabled || !gamesId) return

    let client
    try {
      client = requireSupabase()
    } catch {
      return
    }

    const channel = client
      .channel(`game-round:${gamesId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draw_results',
          filter: `games_id=eq.${gamesId}`,
        },
        () => {
          void sync()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_issues',
          filter: `games_id=eq.${gamesId}`,
        },
        () => {
          void sync()
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [enabled, gamesId, sync])

  useEffect(() => {
    if (!enabled) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [enabled, sync])
}
