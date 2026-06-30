/**
 * Fetch th6688 (laoadmin.top) play catalog for all 7 games and compare with Supabase.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const BASE = 'https://laoadmin.top'
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

const GAME_CODES = [
  'df_pk10',
  'df_pk10_3',
  'df_pk10_5',
  'df_k3',
  'xam_6',
  'xy_28',
  'df_ssc',
]

/** th6688 Chinese group name → our play_groups.code */
const TH6688_GROUP_CODE = {
  df_pk10: { 两面盘: 'lm', 冠亚和: 'gy', '1-10名': 'r1' },
  df_pk10_3: { 两面盘: 'lm', 冠亚和: 'gy', '1-10名': 'r1' },
  df_pk10_5: { 两面盘: 'lm', 冠亚和: 'gy', '1-10名': 'r1' },
  df_k3: {
    和值: 'hz',
    三连号: 'slh',
    三同号: 'sth',
    三不同号: 'sbdh',
    二同号: 'eth',
    二不同号: 'ebdh',
    二同单选: 'etdx',
  },
  xam_6: { 特码: 'tm', 正码: 'zm', 特肖: 'tx', 正肖: 'zx', 两面: 'lm', 波色: 'bs' },
  xy_28: { 整合: 'lm28', 特码: 'hz28', 定位球: 'ball1' },
  df_ssc: { 两面: 'sum', '1-5球': 'ball1' },
}

function mapTh6688Group(gameCode, g) {
  const m = TH6688_GROUP_CODE[gameCode]
  return m?.[g.name] ?? g.code ?? g.name
}

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Accept: 'application/json' } })
  return r.json()
}

const gamesRes = await get('/api/game/games')
if (gamesRes?.code !== 1) {
  console.error('Failed to fetch games', gamesRes)
  process.exit(1)
}

const th6688ByCode = {}
for (const g of gamesRes.data ?? []) {
  if (GAME_CODES.includes(g.code)) th6688ByCode[g.code] = g
}

writeFileSync(
  resolve(root, 'scripts/th6688-all-games.json'),
  JSON.stringify(th6688ByCode, null, 2),
)

console.log('=== th6688 vs Supabase catalog audit ===\n')

let totalIssues = 0

for (const code of GAME_CODES) {
  const th = th6688ByCode[code]
  console.log(`\n######## ${code} ########`)

  if (!th) {
    console.log('  FAIL: not found on th6688 API')
    totalIssues++
    continue
  }

  const groupIds = (th.group ?? []).map((g) => g.id).join(',')
  const pi = groupIds ? await get(`/api/game/play_items?group_id=${groupIds}`) : null

  const thGroups = (th.group ?? []).map((g) => ({
    id: g.id,
    code: mapTh6688Group(code, g),
    name: g.name,
    sort: g.sort,
  }))

  const thItemsByGroup = {}
  if (pi?.code === 1 && pi.data) {
    for (const entry of Object.values(pi.data)) {
      const grp = entry.group
      if (!grp) continue
      const key = grp.code ?? grp.name ?? String(grp.id)
      const items = (entry.categories ?? []).flatMap((c) =>
        (c.items ?? []).map((i) => ({
          code: i.code,
          odds: Number(i.odds),
          cat: c.category?.name,
        })),
      )
      thItemsByGroup[key] = items
    }
  }

  console.log(`  th6688 groups (${thGroups.length}):`)
  for (const g of thGroups) {
    const items = thItemsByGroup[g.code ?? g.name] ?? thItemsByGroup[g.name] ?? []
    console.log(`    [${g.code ?? g.id}] ${g.name} — ${items.length} items`)
  }

  const { data: game } = await supabase.from('games').select('id').eq('code', code).maybeSingle()
  if (!game) {
    console.log('  FAIL: missing in Supabase games table')
    totalIssues++
    continue
  }

  const { data: groups } = await supabase
    .from('play_groups')
    .select('id, code, name, sort')
    .eq('games_id', game.id)
    .order('sort')

  const { data: items } = await supabase
    .from('play_items')
    .select('group_id, bet_content, odds, label')
    .eq('games_id', game.id)
    .eq('status', 1)

  const gmap = new Map((groups ?? []).map((g) => [g.code, g]))
  console.log(`  ours groups (${groups?.length ?? 0}): ${(groups ?? []).map((g) => g.code).join(', ')}`)
  console.log(`  ours items: ${items?.length ?? 0}`)

  // Compare th6688 group codes (when available) with ours
  for (const tg of thGroups) {
    const gcode = tg.code
    if (!gcode) continue
    const ours = gmap.get(gcode)
    if (!ours) {
      console.log(`  MISSING group in DB: ${gcode} (${tg.name})`)
      totalIssues++
      continue
    }
    const thItems = thItemsByGroup[gcode] ?? thItemsByGroup[tg.name] ?? []
    const ourItems = (items ?? []).filter((i) => i.group_id === ours.id)
    if (thItems.length && ourItems.length !== thItems.length) {
      console.log(
        `  COUNT diff ${gcode}: th6688=${thItems.length} ours=${ourItems.length}`,
      )
      totalIssues++
    }
    const thCodes = new Set(thItems.map((i) => i.code))
    const ourCodes = new Set(ourItems.map((i) => i.bet_content))
    for (const c of thCodes) {
      if (!ourCodes.has(c)) {
        console.log(`  MISSING item ${gcode}/${c}`)
        totalIssues++
      }
    }
    for (const c of ourCodes) {
      if (!thCodes.has(c) && thItems.length) {
        console.log(`  EXTRA item ${gcode}/${c}`)
        totalIssues++
      }
    }
    for (const ti of thItems) {
      const oi = ourItems.find((x) => x.bet_content === ti.code)
      if (oi && Math.abs(Number(oi.odds) - ti.odds) > 0.02) {
        console.log(`  ODDS diff ${gcode}/${ti.code}: th=${ti.odds} ours=${oi.odds}`)
        totalIssues++
      }
    }
  }
}

console.log(`\n=== Done: ${totalIssues} issue(s) ===`)
process.exit(totalIssues > 0 ? 1 : 0)
