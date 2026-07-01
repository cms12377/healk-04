import { requireSupabase } from '@/lib/supabase'

/** Advance all games past draw_time — shared by member + admin (same server clock). */
export async function syncDueGames(maxPasses = 10): Promise<number> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('advance_all_due_games', {
    p_max_passes: maxPasses,
  })
  if (error) {
    if (error.message.includes('Could not find')) return 0
    throw new Error(error.message)
  }
  const row = data as { count?: number; entries?: unknown[] } | null
  return Number(row?.count ?? row?.entries?.length ?? 0)
}
