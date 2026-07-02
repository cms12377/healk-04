/**
 * Pre-production checks: critical RPCs, storage, routing parity hints.
 * Usage: yarn verify:prod
 * Requires .env.local or .env with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
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

/** RPC exists if call fails with auth/validation — not "function not found". */
async function rpcExists(supabase, name, args = {}) {
  const { error } = await supabase.rpc(name, args)
  if (!error) return { ok: true, hint: 'ok' }
  const msg = (error.message ?? '').toLowerCase()
  const code = error.code ?? ''
  if (
    msg.includes('could not find') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    code === 'PGRST202'
  ) {
    return { ok: false, hint: error.message }
  }
  return { ok: true, hint: error.message?.slice(0, 80) ?? 'exists' }
}

const MEMBER_RPCS = [
  ['submit_deposit', { p_amount: 0, p_channel_id: 0 }],
  [
    'submit_withdraw',
    {
      p_amount: 0,
      p_pay_password: '',
      p_type: 'bank',
      p_bank_name: null,
      p_bank_card: null,
      p_bank_username: null,
    },
  ],
  ['set_pay_password', { p_password: '000000' }],
  [
    'member_add_bank_card',
    { p_bank_name: 'test', p_bank_username: 'test', p_bank_card: '1234567890' },
  ],
  ['member_update_profile', { p_nickname: null, p_avatar: null }],
  ['submit_identity', { p_real_name: '', p_id_number: '', p_front_url: '', p_back_url: '' }],
  ['submit_bets', { p_games_id: 1, p_issue: 'test', p_bets: [] }],
  ['advance_game_round', { p_games_id: 1 }],
  ['fn_user_profits', { p_user_id: 1, p_start_time: 0, p_end_time: 9999999999 }],
  ['mark_notice_read', { p_notice_id: 0 }],
  ['service_open_chat', { p_guest_key: 'verify-prod' }],
]

const ADMIN_RPCS = [
  ['admin_pending_stats', {}],
  ['admin_list_deposits', { p_status: 'all', p_page: 1, p_limit: 10, p_user_id: null }],
  ['admin_list_withdraws', { p_status: 'all', p_page: 1, p_limit: 10, p_user_id: null }],
  ['admin_review_deposit', { p_order_id: 0, p_action: 'approve', p_note: null }],
  ['admin_review_withdraw', { p_order_id: 0, p_action: 'approve', p_note: null }],
  ['admin_list_identity', { p_page: 1, p_limit: 10 }],
  ['admin_review_identity', { p_user_id: 0, p_action: 'approve', p_note: null }],
  ['admin_list_members', { p_page: 1, p_limit: 10 }],
  ['admin_get_member', { p_user_id: 0 }],
  ['admin_set_member_pay_password', { p_user_id: 0, p_password: '000000' }],
  ['admin_list_games', {}],
  ['admin_set_game_status', { p_games_id: 1, p_status: 1 }],
  ['admin_set_draw_mode', { p_games_id: 1, p_mode: 'random' }],
  ['admin_list_recharge_channels', {}],
  ['admin_get_settings', {}],
]

const ROUTING_CASES = [
  { hash: '#/bindBank', staff: false, expectAdmin: false, note: 'member bind bank' },
  { hash: '#/bindBank?user_id=5', staff: true, expectAdmin: true, note: 'agent view member bank' },
  { hash: '#/identityCard', staff: false, expectAdmin: false, note: 'member KYC' },
  { hash: '#/identityCard', staff: true, expectAdmin: false, note: 'staff self KYC (member app)' },
  { hash: '#/admin/identity', staff: true, expectAdmin: true, note: 'admin KYC queue' },
  { hash: '#/rechargeAdmin', staff: true, expectAdmin: true, note: 'deposit queue' },
  { hash: '#/rechargeAdmin', staff: false, expectAdmin: false, note: 'member blocked from admin' },
  { hash: '#/admin/games', staff: true, expectAdmin: true, note: 'game management' },
]

function shouldUseAdminApp(hash, isStaff) {
  const raw = hash.replace(/^#/, '').replace(/^\//, '')
  const path = raw.split('?')[0]
  const q = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : ''
  const params = new URLSearchParams(q)
  const hasMemberCtx = params.has('user_id') || params.has('userId')
  const selfService = new Set(['identityCard', 'bindBank', 'bindAddress'])
  if (selfService.has(path) && !hasMemberCtx) return false

  const agentMap = {
    rechargeAdmin: true,
    depositAdmin: true,
    bettingHistory: true,
    huiYuan: true,
    chongZhi: true,
  }
  const isAdminPath =
    path.startsWith('admin') ||
    path in agentMap ||
    ['hyChong', 'hyTixian', 'hyTou'].includes(path) ||
    ((path === 'bindBank' || path === 'bindAddress') && hasMemberCtx)

  if (!isAdminPath) return false
  return isStaff
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key || url.includes('your-project')) {
  console.error('❌ ไม่พบ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ใน .env หรือ .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)
const results = []
let failCount = 0

function record(name, ok, detail = '') {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', detail })
  if (!ok) failCount++
}

console.log('🚀 Production readiness verification\n')
console.log(`   Supabase: ${url.replace(/https:\/\/([^.]+).*/, 'https://$1.***')}\n`)

// --- Routing (offline) ---
console.log('── Routing (member ↔ admin) ──')
for (const c of ROUTING_CASES) {
  const actual = shouldUseAdminApp(c.hash, c.staff)
  const ok = actual === c.expectAdmin
  record(`route ${c.note}`, ok, `${c.hash} staff=${c.staff} → admin=${actual}`)
  console.log(`  ${ok ? '✅' : '❌'} ${c.note}: ${c.hash}`)
}

// --- Supabase connectivity ---
console.log('\n── Supabase connectivity ──')
try {
  const { error: pingErr } = await supabase.from('games').select('id', { count: 'exact', head: true })
  if (pingErr) {
    record('games table (anon read)', false, pingErr.message || pingErr.hint || JSON.stringify(pingErr))
    console.log(`  ❌ games: ${pingErr.message || 'unknown error — check RLS/network/API key'}`)
  } else {
    record('games table (anon read)', true)
    console.log('  ✅ games table reachable')
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e)
  record('games table (anon read)', false, msg)
  console.log(`  ❌ games: ${msg}`)
}

// --- Storage bucket (site-assets = slip / KYC / avatar) ---
console.log('\n── Storage ──')
try {
  const { error: listErr } = await supabase.storage.from('site-assets').list('', { limit: 1 })
  if (listErr) {
    const notFound =
      listErr.message?.toLowerCase().includes('not found') ||
      listErr.message?.toLowerCase().includes('bucket')
    record('bucket site-assets', !notFound, listErr.message)
    console.log(`  ${notFound ? '❌' : '⚠️'} site-assets: ${listErr.message}`)
  } else {
    record('bucket site-assets', true)
    console.log('  ✅ site-assets bucket')
  }
} catch (e) {
  record('bucket site-assets', false, e instanceof Error ? e.message : String(e))
}

// --- RPC probes ---
console.log('\n── Member RPCs ──')
for (const [name, args] of MEMBER_RPCS) {
  const { ok, hint } = await rpcExists(supabase, name, args)
  record(`rpc ${name}`, ok, hint)
  console.log(`  ${ok ? '✅' : '❌'} ${name}${ok && hint !== 'ok' ? ` (${hint})` : ''}`)
}

console.log('\n── Admin RPCs (existence; need staff login to succeed) ──')
for (const [name, args] of ADMIN_RPCS) {
  const { ok, hint } = await rpcExists(supabase, name, args)
  record(`rpc ${name}`, ok, hint)
  console.log(`  ${ok ? '✅' : '❌'} ${name}${!ok ? `: ${hint}` : ''}`)
}

// --- Summary ---
console.log('\n' + '─'.repeat(62))
const passCount = results.length - failCount
console.log(`\n${passCount}/${results.length} checks passed, ${failCount} failed`)

if (failCount > 0) {
  console.log('\n💡 แก้ไขที่พบบ่อย:')
  console.log('   • fn_assert_member_manage → fix_assert_member_manage.sql')
  console.log('   • site-assets bucket → fix_member_uploads_storage.sql')
  console.log('   • ฝากเงินอนุมัติทันที → admin_setup.sql + fix_deposit_submit.sql')
  console.log('   • bindBank ไป admin → อัปเดต frontend (shouldUseAdminApp) แล้ว')
  console.log('\n📋 Manual E2E (staging) — ดู docs/PRODUCTION_CHECKLIST.md')
  process.exit(1)
}

console.log('\n✅ Automated checks passed. Run manual E2E on staging before go-live.')
console.log('   See docs/PRODUCTION_CHECKLIST.md')
process.exit(0)
