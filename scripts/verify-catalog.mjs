/**
 * Verify game catalog + core data against expected counts.
 * Usage: node scripts/verify-catalog.mjs
 * Requires .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */
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

function check(name, actual, expected, gte = true) {
  const ok = gte ? actual >= expected : actual === expected
  return { name, actual, expected, status: ok ? 'PASS' : 'FAIL' }
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key || url.includes('your-project')) {
  console.error('❌ ไม่พบ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ใน .env.local')
  console.error('   คัดลอกจาก .env.example แล้วใส่ค่าจาก Supabase Dashboard → Settings → API')
  process.exit(1)
}

const supabase = createClient(url, key)
const results = []
let failCount = 0

function record(row) {
  results.push(row)
  if (row.status === 'FAIL') failCount++
}

async function count(table, filter) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count, error } = await q
  if (error) {
    const detail = error.message || error.hint || error.code || JSON.stringify(error)
    throw new Error(`${table}: ${detail}`)
  }
  return count ?? 0
}

async function fetchGames() {
  const { data, error } = await supabase.from('games').select('id, code, status, sort').order('sort')
  if (error) throw new Error(`games: ${error.message}`)
  return data ?? []
}

async function fetchGroups(gameId) {
  const { data, error } = await supabase
    .from('play_groups')
    .select('id, code')
    .eq('games_id', gameId)
  if (error) throw new Error(`play_groups: ${error.message}`)
  return data ?? []
}

async function fetchItems(gameId) {
  const { data, error } = await supabase
    .from('play_items')
    .select('bet_content, status, group_id')
    .eq('games_id', gameId)
    .eq('status', 1)
  if (error) throw new Error(`play_items: ${error.message}`)
  return data ?? []
}

async function testRpc(name, args = {}) {
  const { error } = await supabase.rpc(name, args)
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('could not find') || msg.includes('does not exist')) return false
    return true
  }
  return true
}

console.log('🔍 Game catalog verification\n')
console.log(`   Supabase: ${url.replace(/https:\/\/([^.]+).*/, 'https://$1.***')}\n`)

try {
  record(check('games total', await count('games'), 7))
  record(check('games active', await count('games', (q) => q.eq('status', 1)), 7))
  record(check('open issues', await count('game_issues', (q) => q.eq('status', 0)), 7))
  record(check('vip_tiers', await count('vip_tiers'), 6))
  record(check('activities', await count('activities', (q) => q.eq('status', 1)), 4))
  record(check('user_notices', await count('user_notices'), 3))

  const games = await fetchGames()
  const byCode = Object.fromEntries(games.map((g) => [g.code, g]))

  const groupExpect = {
    df_pk10: 13,
    df_pk10_3: 13,
    df_pk10_5: 13,
    df_k3: 7,
    xam_6: 5,
    xy_28: 5,
    df_ssc: 7,
  }

  for (const [code, minGroups] of Object.entries(groupExpect)) {
    const g = byCode[code]
    if (!g) {
      record({ name: `${code} exists`, actual: 0, expected: 1, status: 'FAIL' })
      continue
    }
    const groups = await fetchGroups(g.id)
    record(check(`${code} play_groups`, groups.length, minGroups))
    const items = await fetchItems(g.id)
    const bc = items.map((i) => i.bet_content)

    if (code.startsWith('df_pk10')) {
      record(check(`${code} gy_sum`, bc.filter((b) => b.startsWith('gy_sum_')).length, 17))
      record(check(`${code} gyj`, bc.filter((b) => b.startsWith('gyj_')).length, 4))
      record(check(`${code} lm_r sides`, bc.filter((b) => b.startsWith('lm_r')).length, 40))
      record(check(`${code} rank picks`, bc.filter((b) => /^n\d+$/.test(b)).length, 100))
    }
    if (code === 'df_k3') {
      record(check('df_k3 hz items', items.filter((i) => groups.find((g) => g.id === i.group_id)?.code === 'hz').length, 20))
      record(check('df_k3 groups exact', groups.length, 7, false))
    }
    if (code === 'xam_6') {
      record(check('xam_6 tm', bc.filter((b) => b.startsWith('tm_')).length, 49))
      record(check('xam_6 zm', bc.filter((b) => b.startsWith('zm_')).length, 49))
    }
    if (code === 'xy_28') {
      const lm28 = groups.find((g) => g.code === 'lm28')
      const lm28Count = lm28 ? items.filter((i) => i.group_id === lm28.id).length : 0
      record(check('xy_28 lm28 items', lm28Count, 16))
      record(
        check(
          'xy_28 ball sides',
          bc.filter((b) => /^(ball1|b2|b3)_(big|small|odd|even)$/.test(b)).length,
          12,
        ),
      )
      record(check('xy_28 has hz28 group', groups.some((g) => g.code === 'hz28') ? 1 : 0, 1))
    }
    if (code === 'df_ssc') {
      const sumG = groups.find((g) => g.code === 'sum')
      const sumCount = sumG ? items.filter((i) => i.group_id === sumG.id).length : 0
      record(check('df_ssc sum items', sumCount, 7))
      record(
        check(
          'df_ssc ball sides',
          bc.filter((b) => /^(ball1|b[2-5])_(big|small|odd|even)$/.test(b)).length,
          20,
        ),
      )
      record(check('df_ssc has nn group', groups.some((g) => g.code === 'nn') ? 1 : 0, 1))
    }
  }

  const rpcOk = await testRpc('submit_bets', {
    p_games_id: 1,
    p_issue: 'test',
    p_bets: [],
  })
  record({ name: 'RPC submit_bets exists', actual: rpcOk ? 1 : 0, expected: 1, status: rpcOk ? 'PASS' : 'FAIL' })

  const advanceOk = await testRpc('advance_game_round', { p_games_id: 1 })
  record({
    name: 'RPC advance_game_round exists',
    actual: advanceOk ? 1 : 0,
    expected: 1,
    status: advanceOk ? 'PASS' : 'FAIL',
  })
} catch (e) {
  console.error('❌ Error:', e instanceof Error ? e.message : e)
  process.exit(1)
}

console.log('Check'.padEnd(36) + 'Actual'.padStart(8) + 'Expected'.padStart(10) + '  Status')
console.log('-'.repeat(62))
for (const r of results) {
  const line =
    r.name.padEnd(36) +
    String(r.actual).padStart(8) +
    String(r.expected).padStart(10) +
    '  ' +
    (r.status === 'PASS' ? '✅' : '❌') +
    ' ' +
    r.status
  console.log(line)
}

console.log('-'.repeat(62))
const passCount = results.length - failCount
console.log(`\n${passCount}/${results.length} passed, ${failCount} failed`)

if (failCount > 0) {
  console.log('\n💡 แก้ไข: รัน SQL ที่ขาดใน Supabase SQL Editor')
  console.log('   - play_items_full.sql + fix_pk10_full_catalog.sql (PK10)')
  console.log('   - fix_k3_full_catalog.sql (K3)')
  console.log('   - fix_marksix_th6688_ui.sql (Mark Six)')
  console.log('   - fix_other_games.sql + fix_ssc_lucky28_th6688_catalog.sql (Lucky28/SSC)')
  console.log('   - fix_admin_bonus_cms.sql (admin bonus RPCs)')
  console.log('\n   หรือรัน supabase/verify_game_catalog.sql ใน SQL Editor เพื่อรายละเอียดเพิ่ม')
  process.exit(1)
}

console.log('\n✅ Catalog verification passed')
process.exit(0)
