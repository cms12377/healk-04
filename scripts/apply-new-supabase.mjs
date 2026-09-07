/**
 * Apply the full SQL stack to the NEW Supabase project only.
 *
 * Hard-refuses the original project (lfkvdbcfptdvwrpsmoln).
 * Target allowlist: tpryeljcouzoboptmiji
 *
 * Uses psql + PGPASSWORD (never puts the password in a URI).
 *
 * Usage:
 *   node scripts/apply-new-supabase.mjs --ping
 *   node scripts/apply-new-supabase.mjs
 *   node scripts/apply-new-supabase.mjs --from=12
 */
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ALLOWED_REF = 'tpryeljcouzoboptmiji'
const FORBIDDEN_REF = 'lfkvdbcfptdvwrpsmoln'
const POOLER_REGIONS = [
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'eu-central-1',
  'eu-west-1',
  'us-east-1',
  'us-west-1',
]

const FILES = [
  'database.sql',
  'supabase/admin_setup.sql',
  'supabase/game_betting.sql',
  'supabase/fix_pgcrypto_pay_password.sql',
  'supabase/fix_deposit_submit.sql',
  'supabase/fix_admin_member_crud.sql',
  'supabase/fix_pay_password_member_lock.sql',
  'supabase/fix_bank_cards_member.sql',
  'supabase/fix_recharge_qrcode_storage.sql',
  'supabase/fix_member_uploads_storage.sql',
  'supabase/fix_member_avatar.sql',
  'supabase/fix_identity_kyc.sql',
  'supabase/fix_submit_rpc_overloads.sql',
  'supabase/fix_admin_th6688_menus.sql',
  'supabase/fix_admin_agent_orders.sql',
  'supabase/fix_admin_recharge_channels.sql',
  'supabase/fix_admin_cms.sql',
  'supabase/fix_admin_bonus_cms.sql',
  'supabase/fix_internal_service_chat.sql',
  'supabase/fix_service_chat_media.sql',
  'supabase/play_items_full.sql',
  'supabase/fix_pk10_categories.sql',
  'supabase/fix_pk10_full_catalog.sql',
  'supabase/fix_pk10_gy_sum_odds_100.sql',
  'supabase/fix_k3_full_catalog.sql',
  'supabase/fix_other_games.sql',
  'supabase/fix_ssc_lucky28_th6688_catalog.sql',
  'supabase/fix_ssc_legacy_sides.sql',
  'supabase/fix_marksix_th6688_ui.sql',
  'supabase/fix_marksix_th6688_parity.sql',
  'supabase/fix_draw_mode.sql',
  'supabase/fix_th6688_parity.sql',
  'supabase/fix_th6688_fair_draw.sql',
  'supabase/advance_due_games.sql',
  'supabase/fix_th6688_runtime_defaults.sql',
  'supabase/fix_game_realtime.sql',
  'supabase/fix_balance_realtime.sql',
  'supabase/fix_scheduled_draw_results.sql',
  'supabase/fix_scheduled_draw_countdown.sql',
  'supabase/fix_scheduled_draw_alignment.sql',
  'supabase/fix_scheduled_draw_sort_cleanup.sql',
  'supabase/fix_scheduled_draw_time_window.sql',
  'supabase/fix_scheduled_draw_issue_align.sql',
  'supabase/fix_scheduled_draw_issue_gap.sql',
  'supabase/fix_scheduled_draw_sequential.sql',
  'supabase/fix_game_issues_countdown.sql',
  'supabase/remove_withdraw_limits.sql',
  'supabase/block_member_transactions.sql',
  'supabase/fix_withdraw_balance_column.sql',
  'supabase/block_member_readonly.sql',
  'supabase/fix_member_invite.sql',
  'supabase/fix_count_issue_wins.sql',
]

function loadEnv() {
  const env = {}
  for (const file of ['.env.local', '.env']) {
    const path = resolve(root, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      if (env[key] != null) continue
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  }
  return env
}

function assertNewProjectOnly(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Missing VITE_SUPABASE_URL')
  }
  if (url.includes(FORBIDDEN_REF)) {
    throw new Error('Refusing to run against the ORIGINAL database (lfkvdbcfptdvwrpsmoln)')
  }
  if (!url.includes(ALLOWED_REF)) {
    throw new Error(`Refusing unexpected Supabase host. Allowed ref: ${ALLOWED_REF}`)
  }
}

function runPsql(target, password, sql, connectTimeout = '8') {
  const dir = mkdtempSync(join(tmpdir(), 'pklotery-sql-'))
  const file = join(dir, 'stmt.sql')
  writeFileSync(file, sql, 'utf8')
  return spawnSync(
    'psql',
    [
      '-h',
      target.host,
      '-p',
      String(target.port),
      '-U',
      target.user,
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
      '-f',
      file,
    ],
    {
      encoding: 'utf8',
      timeout: 180000,
      windowsHide: true,
      env: {
        ...process.env,
        PGPASSWORD: password,
        PGSSLMODE: 'require',
        PGCONNECT_TIMEOUT: connectTimeout,
      },
    },
  )
}

function candidateTargets() {
  const user = `postgres.${ALLOWED_REF}`
  const list = []
  for (const region of POOLER_REGIONS) {
    for (const prefix of ['aws-0', 'aws-1']) {
      for (const port of [5432, 6543]) {
        list.push({
          host: `${prefix}-${region}.pooler.supabase.com`,
          port,
          user,
          label: `${prefix}-${region}:${port}`,
        })
      }
    }
  }
  return list
}

function probeConnection(password) {
  for (const target of candidateTargets()) {
    process.stdout.write(`  try ${target.label} ... `)
    const result = runPsql(target, password, 'select current_database() as db;', '5')
    if (result.status === 0) {
      console.log('OK')
      return { ok: true, target }
    }
    const err = (result.stderr || result.stdout || '').split('\n')[0] || `exit ${result.status}`
    console.log(err.replace(password, '***').slice(0, 140))
  }
  return { ok: false }
}

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
assertNewProjectOnly(url)

const password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD
const pingOnly = process.argv.includes('--ping')
const fromArg = process.argv.find((a) => a.startsWith('--from='))
const fromIdx = fromArg ? Math.max(1, Number(fromArg.slice('--from='.length))) : 1

console.log(`Target: ${url}`)
console.log(`Guard: original ${FORBIDDEN_REF} is blocked`)
console.log(`Files: ${FILES.length}\n`)

if (!password) {
  console.error('Need SUPABASE_DB_PASSWORD in .env.local')
  process.exit(2)
}

console.log('Probing Postgres pooler (new project only)...')
const probe = probeConnection(password)
if (!probe.ok) {
  console.error('Could not connect. Check Database password and that IPv4 pooler is enabled.')
  process.exit(2)
}
console.log(`Using ${probe.target.label}\n`)
if (pingOnly) process.exit(0)

for (let i = fromIdx - 1; i < FILES.length; i++) {
  const rel = FILES[i]
  const full = resolve(root, rel)
  if (!existsSync(full)) {
    console.error(`Missing file: ${rel}`)
    process.exit(1)
  }
  const sql = readFileSync(full, 'utf8')
  process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${FILES.length}] ${rel} ... `)
  const result = runPsql(probe.target, password, sql, '20')
  if (result.status !== 0) {
    console.log('FAIL')
    const err = `${result.stderr || ''}${result.stdout || ''}`.replaceAll(password, '***')
    console.error(err)
    console.error(`\nStopped at #${i + 1} ${rel}`)
    console.error(`Resume with: node scripts/apply-new-supabase.mjs --from=${i + 1}`)
    process.exit(1)
  }
  console.log('OK')
}

console.log(`\nApplied ${FILES.length - fromIdx + 1} file(s) to ${ALLOWED_REF} only.`)
console.log('Original project was not used.')
