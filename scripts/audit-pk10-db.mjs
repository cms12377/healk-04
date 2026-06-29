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

const PK10_CODES = ['df_pk10', 'df_pk10_3', 'df_pk10_5']

console.log('=== PK10 Database Audit ===\n')

const { data: games, error: gErr } = await supabase
  .from('games')
  .select('id, code, name, status')
  .in('code', PK10_CODES)
  .order('id')

if (gErr) {
  console.error('FAIL games:', gErr.message)
  process.exit(1)
}

for (const game of games ?? []) {
  console.log(`\n--- ${game.code} (id=${game.id}, status=${game.status}) ---`)

  const { data: groups } = await supabase
    .from('play_groups')
    .select('id, code, name, sort')
    .eq('games_id', game.id)
    .order('sort')

  const { data: items } = await supabase
    .from('play_items')
    .select('id, group_id, category_id, label, bet_content')
    .eq('games_id', game.id)
    .eq('status', 1)

  const { data: cats } = await supabase
    .from('play_categories')
    .select('id, name')
    .eq('games_id', game.id)

  const { data: issues } = await supabase
    .from('game_issues')
    .select('issue, status, draw_time')
    .eq('games_id', game.id)
    .order('draw_time', { ascending: false })
    .limit(2)

  const { data: draws } = await supabase
    .from('draw_results')
    .select('id, issue')
    .eq('games_id', game.id)
    .limit(3)

  const groupCodes = (groups ?? []).map((g) => g.code).join(', ') || '(none)'
  const rankGroups = (groups ?? []).filter((g) => /^r\d+$/.test(g.code ?? '')).length
  const lmGroup = (groups ?? []).find((g) => g.code === 'lm')
  const lmItems = (items ?? []).filter((i) => i.group_id === lmGroup?.id)
  const lmWithCat = lmItems.filter((i) => i.category_id != null).length
  const lmFlat = lmItems.filter((i) => i.category_id == null).length

  console.log(`  play_groups: ${groups?.length ?? 0} [${groupCodes}]`)
  console.log(`  rank groups (r1-r10): ${rankGroups} (expected 10 if play_items_full ran)`)
  const gyGroup = (groups ?? []).find((g) => g.code === 'gy')
  const gyItems = gyGroup ? (items ?? []).filter((i) => i.group_id === gyGroup.id) : []
  const lmR1Count = lmItems.filter((i) => i.bet_content?.startsWith('lm_r1_')).length
  console.log(`  play_categories: ${cats?.length ?? 0} (expected 12: 10 ranks + 2 gy)`)
  console.log(`  play_items total: ${items?.length ?? 0}`)
  console.log(`  lm items: ${lmItems.length} (with category: ${lmWithCat}, flat: ${lmFlat})`)
  console.log(`  lm rank1 items (expect 6): ${lmR1Count}`)
  console.log(`  gy items (expect 21): ${gyItems.length}`)
  console.log(`  game_issues: ${issues?.length ?? 0} latest: ${issues?.[0]?.issue ?? 'NONE'}`)
  console.log(`  draw_results sample: ${draws?.length ?? 0}`)

  // Expected for th6688-like UI
  const checks = []
  if ((groups ?? []).length < 3) checks.push('MISSING groups — need lm + gy + r1-r10 (run play_items_full.sql)')
  if (rankGroups < 10) checks.push('MISSING rank groups r1-r10 — run play_items_full.sql')
  if ((cats ?? []).length < 12) checks.push('MISSING play_categories — run fix_pk10_categories.sql + fix_pk10_full_catalog.sql')
  if (lmWithCat < 50) checks.push('lm incomplete — run fix_pk10_full_catalog.sql (expect 50 categorized)')
  if (lmR1Count < 6) checks.push('MISSING dragon/tiger — run fix_pk10_full_catalog.sql')
  if (gyItems.length < 21) checks.push('gy incomplete — run fix_pk10_full_catalog.sql (17 sum + 4 side)')
  if (!issues?.length) checks.push('MISSING game_issues — no countdown/betting round')
  if (!draws?.length) checks.push('MISSING draw_results — no last draw balls')

  if (checks.length) {
    console.log('  ISSUES:')
    checks.forEach((c) => console.log(`    - ${c}`))
  } else {
    console.log('  OK: data looks complete for PK10 UI')
  }
}

console.log('\n=== th6688 expects (df_pk10) ===')
console.log('  Sidebar: สองด้าน (lm+categories), ผลรวม (gy+gyj), อันดับ 1-10 (r1-r10)')
console.log('  Minimum: 12 groups, 10 categories, 100+ play_items for df_pk10 alone')
