import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(root, file)
    if (!existsSync(path)) continue
    const env = {}
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
    return env
  }
  return {}
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.log('no supabase env')
  process.exit(0)
}

const sb = createClient(url, key)
const { data: game, error: gErr } = await sb.from('games').select('id').eq('code', 'xy_28').single()
if (gErr) throw gErr

const { data: groups } = await sb.from('play_groups').select('id,code,name').eq('games_id', game.id)
for (const pg of groups ?? []) {
  if (!['hz28', 'lm28'].includes(pg.code)) continue
  const { data: items, count } = await sb
    .from('play_items')
    .select('bet_content,label,status', { count: 'exact' })
    .eq('group_id', pg.id)
  const sample = items?.slice(0, 5).map((i) => i.bet_content).join(', ')
  const sumCount = items?.filter((i) => /^sum_\d+$/.test(i.bet_content)).length ?? 0
  const sideCount = items?.filter((i) =>
    ['big', 'small', 'odd', 'even', 'bigOdd'].includes(i.bet_content),
  ).length ?? 0
  console.log(pg.code, pg.name, 'total', count, 'sum', sumCount, 'side', sideCount, 'sample:', sample)
}
