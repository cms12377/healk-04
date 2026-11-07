/**
 * Advance all games whose countdown has elapsed (calls advance_all_due_games RPC).
 * Run manually or on a schedule (every 1 min) so 1-min games (K3, SSC) don't stay stuck.
 *
 *   node scripts/advance-due-games.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envText = readFileSync(resolve(root, '.env'), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const { data, error } = await supabase.rpc('advance_all_due_games', { p_max_passes: 10 })

if (error) {
  if (error.message.includes('Could not find')) {
    console.error('Missing RPC advance_all_due_games — run supabase/advance_due_games.sql first')
  } else {
    console.error('FAIL:', error.message)
  }
  process.exit(1)
}

const entries = data?.entries ?? []
console.log(`Advanced ${data?.count ?? entries.length} pass(es):`)
for (const row of entries) {
  const adv = row.advance ?? {}
  if (adv.skipped) {
    console.log(`  ${row.code}: skipped (${adv.reason ?? 'unknown'}) issue=${adv.issue ?? '?'}`)
  } else {
    console.log(
      `  ${row.code}: ${adv.drawn_issue} → ${adv.result} | new=${adv.new_issue}`,
    )
  }
}

if (entries.length === 0) {
  console.log('  (none due)')
}
