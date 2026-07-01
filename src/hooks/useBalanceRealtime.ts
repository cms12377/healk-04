import { useEffect } from 'react'
import { requireSupabase } from '@/lib/supabase'

/** Refresh profile when balance / unsettled changes (after bet settle or deposit approve). */
export function useBalanceRealtime(userId: number | undefined, onRefresh: () => void) {
  useEffect(() => {
    if (!userId) return

    let client
    try {
      client = requireSupabase()
    } catch {
      return
    }

    const refresh = () => {
      void onRefresh()
    }

    const channel = client
      .channel(`user-balance:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_money_logs',
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [userId, onRefresh])
}
