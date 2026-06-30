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
const th6688 = JSON.parse(readFileSync(resolve(root, 'scripts/th6688-k3-play_items.json'), 'utf8'))

const TH6688_GROUP_MAP = {
  7: 'hz',
  8: 'slh',
  9: 'sth',
  10: 'sbdh',
  11: 'eth',
  12: 'ebdh',
  13: 'etdx',
}

function th6688Catalog() {
  const out = {}
  for (const entry of Object.values(th6688.data)) {
    const gid = entry.group?.id
    const code = TH6688_GROUP_MAP[gid]
    if (!code) continue
    const items = (entry.categories ?? []).flatMap((c) => c.items ?? [])
    out[code] = items.map((i) => ({
      code: i.code,
      odds: Number(i.odds),
    }))
  }
  return out
}

const ref = th6688Catalog()

const { data: game } = await supabase.from('games').select('id').eq('code', 'df_k3').single()
const { data: groups } = await supabase
  .from('play_groups')
  .select('id, code')
  .eq('games_id', game.id)
const { data: items } = await supabase
  .from('play_items')
  .select('group_id, bet_content, odds')
  .eq('games_id', game.id)
  .eq('status', 1)

const gmap = new Map(groups.map((g) => [g.id, g.code]))
const ours = {}
for (const item of items) {
  const code = gmap.get(item.group_id)
  if (!code) continue
  if (!ours[code]) ours[code] = []
  ours[code].push({ code: item.bet_content, odds: Number(item.odds) })
}

const order = ['hz', 'slh', 'sth', 'sbdh', 'eth', 'ebdh', 'etdx']
let issues = 0

console.log('=== K3 catalog: ours vs th6688 ===\n')
for (const grp of order) {
  const r = ref[grp] ?? []
  const o = ours[grp] ?? []
  console.log(`--- ${grp} ---`)
  console.log(`  th6688: ${r.length} items | ours: ${o.length} items`)

  if (r.length !== o.length) {
    console.log('  ISSUE: item count mismatch')
    issues++
  }

  const rCodes = new Set(r.map((x) => x.code))
  const oCodes = new Set(o.map((x) => x.code))
  for (const c of rCodes) {
    if (!oCodes.has(c)) {
      console.log(`  MISSING in DB: ${c}`)
      issues++
    }
  }
  for (const c of oCodes) {
    if (!rCodes.has(c)) {
      console.log(`  EXTRA in DB: ${c}`)
      issues++
    }
  }

  for (const ri of r) {
    const oi = o.find((x) => x.code === ri.code)
    if (oi && Math.abs(oi.odds - ri.odds) > 0.01) {
      console.log(`  ODDS diff ${ri.code}: th6688=${ri.odds} ours=${oi.odds}`)
      issues++
    }
  }
}

console.log(`\n${issues === 0 ? 'OK: catalog matches th6688' : `FOUND ${issues} catalog issue(s)`}`)
