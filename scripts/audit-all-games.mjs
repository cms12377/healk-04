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

const GAMES = [
  { code: 'df_pk10', type: 'pk10', expectGroups: 12, expectItems: 100 },
  { code: 'df_pk10_3', type: 'pk10', expectGroups: 12, expectItems: 100 },
  { code: 'df_pk10_5', type: 'pk10', expectGroups: 12, expectItems: 100 },
  { code: 'df_k3', type: 'k3', expectGroups: 7, expectItems: 35 },
  { code: 'xam_6', type: 'marksix', expectGroups: 6, expectItems: 100 },
  { code: 'xy_28', type: 'lucky28', expectGroups: 5, expectItems: 50 },
  { code: 'df_ssc', type: 'ssc', expectGroups: 6, expectItems: 60 },
]

const EXPECT_GROUP_CODES = {
  df_k3: ['hz', 'slh', 'sth', 'sbdh', 'eth', 'ebdh', 'etdx'],
  xam_6: ['lm', 'tm', 'zm', 'tx', 'zx', 'bs'],
  xy_28: ['lm28', 'ball1', 'b2', 'b3', 'hz28'],
  df_ssc: ['ball1', 'b2', 'b3', 'b4', 'b5', 'nn'],
}

console.log('=== All Games Database Audit ===\n')

const { data: allGames, error: gErr } = await supabase
  .from('games')
  .select('id, code, name, status')
  .in(
    'code',
    GAMES.map((g) => g.code),
  )
  .order('id')

if (gErr) {
  console.error('FAIL games:', gErr.message)
  process.exit(1)
}

for (const spec of GAMES) {
  const game = allGames?.find((g) => g.code === spec.code)
  console.log(`\n--- ${spec.code} (${spec.type}) ---`)

  if (!game) {
    console.log('  ISSUE: game row missing in games table')
    continue
  }

  const { data: groups } = await supabase
    .from('play_groups')
    .select('id, code, name, sort')
    .eq('games_id', game.id)
    .order('sort')

  const { data: items } = await supabase
    .from('play_items')
    .select('id, group_id, label, bet_content')
    .eq('games_id', game.id)
    .eq('status', 1)

  const { data: issues } = await supabase
    .from('game_issues')
    .select('issue, status, bet_quick_amount, draw_time')
    .eq('games_id', game.id)
    .order('draw_time', { ascending: false })
    .limit(1)

  const { data: draws } = await supabase
    .from('draw_results')
    .select('id, issue')
    .eq('games_id', game.id)
    .limit(1)

  const groupCodes = (groups ?? []).map((g) => g.code)
  const checks = []
  const left = issues?.[0]?.draw_time
    ? Number(issues[0].draw_time) - Math.floor(Date.now() / 1000)
    : null

  console.log(`  play_groups: ${groups?.length ?? 0} [${groupCodes.join(', ')}]`)
  console.log(`  play_items: ${items?.length ?? 0}`)
  console.log(`  bet_quick_amount: ${JSON.stringify(issues?.[0]?.bet_quick_amount ?? null)}`)
  if (left != null) {
    console.log(
      `  countdown_left: ${left}s (${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')})`,
    )
  }
  console.log(`  game_issues: ${issues?.length ?? 0} latest: ${issues?.[0]?.issue ?? 'NONE'}`)
  console.log(`  draw_results: ${draws?.length ?? 0}`)

  if ((groups ?? []).length < spec.expectGroups) {
    checks.push(`groups < ${spec.expectGroups} — run play_items_full.sql`)
  }
  if ((items ?? []).length < spec.expectItems) {
    checks.push(`items < ${spec.expectItems} — run play_items_full.sql`)
  }
  if (!issues?.length) checks.push('MISSING game_issues — no countdown')
  if (!draws?.length) checks.push('MISSING draw_results — no last draw')
  if (left != null && left <= 0) {
    checks.push('draw_time expired — run supabase/fix_game_issues_countdown.sql in Supabase SQL Editor')
  }

  const chips = issues?.[0]?.bet_quick_amount
  const normalized = JSON.stringify(['1000', '5000', '10000', '50000'])
  if (JSON.stringify(chips) !== normalized) {
    checks.push('bet_quick_amount not th6688 chips — run supabase/fix_game_issues_countdown.sql in Supabase SQL Editor')
  }

  const expected = EXPECT_GROUP_CODES[spec.code]
  if (expected) {
    for (const code of expected) {
      if (!groupCodes.includes(code)) checks.push(`MISSING group "${code}" — run fix_other_games.sql`)
    }
  }

  if (spec.type === 'pk10') {
    const rankCount = groupCodes.filter((c) => /^r\d+$/.test(c)).length
    if (rankCount < 10) checks.push('MISSING r1-r10 — run fix_pk10_full_catalog.sql')
  }

  if (spec.code === 'xy_28') {
    const ball1 = groups?.find((g) => g.code === 'ball1')
    const ball1Items = ball1 ? (items ?? []).filter((i) => i.group_id === ball1.id).length : 0
    if (!ball1) checks.push('MISSING ball1 group — run fix_other_games.sql')
    else if (ball1Items < 10) checks.push(`ball1 has ${ball1Items}/10 items — run fix_other_games.sql`)
  }

  if (checks.length) {
    console.log('  ISSUES:')
    checks.forEach((c) => console.log(`    - ${c}`))
  } else {
    console.log('  OK: catalog looks complete for UI')
  }
}

console.log('\n=== UI sidebar (th6688 CheBian) ===')
console.log('  pk10: สองด้าน | ผลรวม | อันดับ 1–10')
console.log('  k3: ผลรวม | เรียง | ตอง | ไม่ซ้ำ3 | คู่เดียวกัน | ไม่ซ้ำ2 | คู่+เดี่ยว')
console.log('  marksix: สองด้าน | รางวัลพิเศษ | รางวัลหลัก | นักษัตรพิเศษ | นักษัตรหลัก | สีคลื่น')
console.log('  lucky28: สองด้าน | ลูกที่ 1–3 | ผลรวม')
console.log('  ssc: ลูกที่ 1–5 | บิว')
