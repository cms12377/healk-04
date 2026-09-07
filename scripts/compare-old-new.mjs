/**
 * Read-only compare: original (.env) vs new (.env.local)
 * Never writes. Prints refs only, not keys.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseEnvFile(file) {
  const path = resolve(root, file)
  if (!existsSync(path)) throw new Error(`missing ${file}`)
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

function refOf(url) {
  return url.replace(/^https:\/\//, '').split('.')[0]
}

async function rpcExists(supabase, name, args = {}) {
  const { error } = await supabase.rpc(name, args)
  if (!error) return true
  const msg = (error.message ?? '').toLowerCase()
  const code = error.code ?? ''
  if (
    msg.includes('could not find') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    code === 'PGRST202'
  ) {
    return false
  }
  return true
}

async function count(supabase, table, col = 'id') {
  const { count: n, error } = await supabase.from(table).select(col, { count: 'exact', head: true })
  if (error) return { error: error.message }
  return { n: n ?? 0 }
}

const TABLES = [
  ['games', 'id'],
  ['play_groups', 'id'],
  ['play_items', 'id'],
  ['play_categories', 'id'],
  ['game_issues', 'id'],
  ['draw_results', 'id'],
  ['game_categories', 'id'],
  ['game_rules', 'id'],
  ['vip_tiers', 'level'],
  ['activities', 'id'],
  ['user_notices', 'id'],
  ['recharge_channels', 'id'],
  ['site_settings', 'id'],
  ['site_banners', 'id'],
  ['scheduled_draw_results', 'id'],
  ['service_conversations', 'id'],
  ['service_messages', 'id'],
  ['users', 'id'],
  ['deposit_orders', 'id'],
  ['withdraw_orders', 'id'],
  ['bet_records', 'id'],
]

const RPCS = [
  ['fn_current_user_role', {}],
  ['fn_is_staff', {}],
  ['advance_all_due_games', { p_max_passes: 1 }],
  ['advance_game_round', { p_games_id: 1 }],
  ['submit_bets', { p_games_id: 1, p_issue: 'test', p_bets: [] }],
  ['submit_deposit', { p_amount: 0, p_channel_id: 0 }],
  ['submit_withdraw', { p_amount: 0, p_pay_password: '', p_type: 'bank' }],
  ['set_pay_password', { p_password: '000000' }],
  ['member_add_bank_card', { p_bank_name: 't', p_bank_username: 't', p_bank_card: '1234567890' }],
  ['member_update_profile', { p_nickname: null, p_avatar: null }],
  ['submit_identity', { p_real_name: '', p_id_number: '', p_front_url: '', p_back_url: '' }],
  ['fn_user_profits', { p_user_id: 1, p_start_time: 0, p_end_time: 9 }],
  ['mark_notice_read', { p_notice_id: 0 }],
  ['service_open_chat', { p_guest_key: 'cmp' }],
  ['service_send_chat_message', { p_guest_key: 'cmp', p_body: 'x' }],
  ['service_poll_chat_messages', { p_guest_key: 'cmp', p_after_id: 0 }],
  ['service_recall_chat_message', { p_message_id: 0, p_guest_key: 'cmp' }],
  ['admin_pending_stats', {}],
  ['admin_list_deposits', { p_status: 'all', p_page: 1, p_limit: 1 }],
  ['admin_list_withdraws', { p_status: 'all', p_page: 1, p_limit: 1 }],
  ['admin_list_bets', { p_status: 'all', p_page: 1, p_limit: 1 }],
  ['admin_review_deposit', { p_order_id: 0, p_action: 'approve' }],
  ['admin_review_withdraw', { p_order_id: 0, p_action: 'approve' }],
  ['admin_manual_deposit', { p_user_id: 0, p_amount: 1 }],
  ['admin_list_identity', { p_page: 1, p_limit: 1 }],
  ['admin_review_identity', { p_user_id: 0, p_action: 'approve' }],
  ['admin_list_members', { p_page: 1, p_limit: 1 }],
  ['admin_get_member', { p_user_id: 0 }],
  ['admin_update_member', { p_user_id: 0 }],
  ['admin_set_member_status', { p_user_id: 0, p_status: 1 }],
  ['admin_delete_member', { p_user_id: 0 }],
  ['admin_set_member_pay_password', { p_user_id: 0, p_password: '000000' }],
  ['admin_get_member_payment', { p_user_id: 0 }],
  ['admin_list_games', {}],
  ['admin_set_game_status', { p_games_id: 1, p_status: 1 }],
  ['admin_set_draw_mode', { p_games_id: 1, p_mode: 'random' }],
  ['admin_set_next_draw_result', { p_games_id: 1, p_result: null }],
  ['admin_force_advance_game', { p_games_id: 1 }],
  ['admin_list_scheduled_draws', { p_games_id: 1 }],
  ['admin_generate_draw_schedule', { p_games_id: 1, p_count: 1 }],
  ['admin_upsert_scheduled_draw', { p_id: null, p_games_id: 1 }],
  ['admin_delete_scheduled_draw', { p_id: 0 }],
  ['admin_list_recharge_channels', {}],
  ['admin_save_recharge_channel', { p_id: null, p_type: 'bank', p_name: 'x' }],
  ['admin_get_settings', {}],
  ['admin_update_settings', {}],
  ['admin_list_service_chats', {}],
  ['admin_get_service_chat_thread', { p_conversation_id: 0 }],
  ['admin_reply_service_chat', { p_conversation_id: 0, p_body: 'x' }],
  ['admin_recall_service_chat_message', { p_message_id: 0 }],
  ['admin_service_unread_count', {}],
  ['admin_list_activities', {}],
  ['admin_save_activity', { p_id: null, p_title: 'x' }],
  ['admin_delete_activity', { p_id: 0 }],
  ['admin_list_vip_tiers', {}],
  ['admin_save_vip_tier', { p_level: 1 }],
  ['admin_delete_vip_tier', { p_level: 99 }],
  ['admin_list_user_notices', {}],
  ['admin_save_user_notice', { p_id: null, p_title: 'x' }],
  ['admin_delete_user_notice', { p_id: 0 }],
]

function loadOldEnv() {
  if (process.env.ORIGIN_SUPABASE_URL && process.env.ORIGIN_SUPABASE_ANON_KEY) {
    return {
      VITE_SUPABASE_URL: process.env.ORIGIN_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.ORIGIN_SUPABASE_ANON_KEY,
    }
  }
  return parseEnvFile('.env')
}

const oldEnv = loadOldEnv()
const newEnv = parseEnvFile('.env.local')
const oldRef = refOf(oldEnv.VITE_SUPABASE_URL)
const newRef = refOf(newEnv.VITE_SUPABASE_URL)
if (oldRef === newRef) throw new Error('old and new env point to the same project')

const oldDb = createClient(oldEnv.VITE_SUPABASE_URL, oldEnv.VITE_SUPABASE_ANON_KEY)
const newDb = createClient(newEnv.VITE_SUPABASE_URL, newEnv.VITE_SUPABASE_ANON_KEY)

console.log(`OLD  ${oldRef}`)
console.log(`NEW  ${newRef}`)
console.log('')

console.log('── Tables (row counts) ──')
let tableMismatch = 0
for (const [table, col] of TABLES) {
  const a = await count(oldDb, table, col)
  const b = await count(newDb, table, col)
  const aTxt = a.error ? `ERR:${a.error.slice(0, 40)}` : String(a.n)
  const bTxt = b.error ? `ERR:${b.error.slice(0, 40)}` : String(b.n)
  const schemaOk = !a.error && !b.error
  const seedish = ['users', 'deposit_orders', 'withdraw_orders', 'bet_records', 'draw_results', 'scheduled_draw_results', 'service_conversations', 'service_messages'].includes(table)
  let mark = 'OK'
  if (!schemaOk) {
    mark = 'SCHEMA?'
    tableMismatch++
  } else if (!seedish && a.n !== b.n) {
    mark = 'COUNT'
    tableMismatch++
  } else if (seedish && a.n !== b.n) {
    mark = 'data≠'
  }
  console.log(`  ${mark.padEnd(8)} ${table.padEnd(26)} old=${aTxt.padStart(6)}  new=${bTxt.padStart(6)}`)
}

console.log('\n── RPCs the app calls ──')
let rpcMissingNew = 0
let rpcMissingOld = 0
for (const [name, args] of RPCS) {
  const o = await rpcExists(oldDb, name, args)
  const n = await rpcExists(newDb, name, args)
  let mark = 'OK'
  if (o && !n) {
    mark = 'NEW-MISS'
    rpcMissingNew++
  } else if (!o && n) {
    mark = 'OLD-MISS'
    rpcMissingOld++
  } else if (!o && !n) {
    mark = 'BOTH-MISS'
    rpcMissingNew++
    rpcMissingOld++
  }
  if (mark !== 'OK') console.log(`  ${mark.padEnd(10)} ${name}`)
}
if (rpcMissingNew === 0 && rpcMissingOld === 0) {
  console.log(`  all ${RPCS.length} RPCs exist on both`)
}

async function bucketOk(db) {
  const { error } = await db.storage.from('site-assets').list('', { limit: 1 })
  if (!error) return true
  const msg = (error.message || '').toLowerCase()
  return !(msg.includes('not found') || msg.includes('bucket'))
}

const oldBucket = await bucketOk(oldDb)
const newBucket = await bucketOk(newDb)
console.log('\n── Storage ──')
console.log(`  site-assets  old=${oldBucket}  new=${newBucket}`)

console.log('\n── Summary ──')
console.log(`  catalog/table schema issues: ${tableMismatch}`)
console.log(`  RPCs missing on NEW: ${rpcMissingNew}`)
console.log(`  RPCs missing on OLD: ${rpcMissingOld}`)
console.log('  users/orders/bets counts can differ — live data was not copied')
process.exit(rpcMissingNew > 0 || !newBucket ? 1 : 0)
