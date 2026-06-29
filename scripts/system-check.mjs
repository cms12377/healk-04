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

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('FAIL: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)
const results = []

function ok(name, detail = '') {
  results.push({ status: 'OK', name, detail })
  console.log(`OK  ${name}${detail ? `: ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ status: 'FAIL', name, detail })
  console.log(`FAIL ${name}${detail ? `: ${detail}` : ''}`)
}
function warn(name, detail = '') {
  results.push({ status: 'WARN', name, detail })
  console.log(`WARN ${name}${detail ? `: ${detail}` : ''}`)
}

async function rpcExists(name) {
  const { error } = await supabase.rpc(name)
  if (!error) return true
  if (error.message?.includes('Could not find the function') || error.code === 'PGRST202') return false
  return true
}

const testUser = `audit_${Date.now()}`
const testPass = 'TestPass123!'
const testEmail = `${testUser}@pklotery.local`

console.log('=== PKLotery System Check ===\n')

// 1. Public read (games, banners)
const { data: games, error: gamesErr } = await supabase.from('games').select('id, name').eq('status', 1).limit(3)
if (gamesErr) fail('DB: games readable', gamesErr.message)
else ok('DB: games readable', `${games?.length ?? 0} active games`)

const { data: banners, error: bannersErr } = await supabase.from('site_banners').select('id').limit(1)
if (bannersErr) fail('DB: site_banners readable', bannersErr.message)
else ok('DB: site_banners readable', `${banners?.length ?? 0} rows`)

// 2. RPC existence checks
for (const rpc of ['submit_bets', 'fn_is_staff', 'fn_current_user_role', 'admin_list_deposits']) {
  const exists = await rpcExists(rpc)
  if (exists) ok(`RPC: ${rpc} exists`)
  else fail(`RPC: ${rpc} missing — run SQL setup`)
}

// 3. Register
const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
  email: testEmail,
  password: testPass,
  options: { data: { username: testUser, nickname: testUser } },
})
if (signUpErr) {
  fail('Auth: register', signUpErr.message)
} else if (!signUp.session) {
  fail('Auth: register session', 'No session — disable Confirm email in Supabase Dashboard')
} else {
  ok('Auth: register', `user ${testUser}`)
}

// 4. Profile after trigger
if (signUp?.session) {
  await new Promise((r) => setTimeout(r, 1500))
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('id, username, money, role')
    .eq('auth_user_id', signUp.session.user.id)
    .maybeSingle()
  if (profileErr) fail('DB: users profile after register', profileErr.message)
  else if (!profile) fail('DB: users profile after register', 'trigger may not have run')
  else ok('DB: users profile after register', `id=${profile.id} balance=${profile.money}`)
}

// 5. Logout + login
await supabase.auth.signOut()
const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPass,
})
if (signInErr) fail('Auth: login', signInErr.message)
else if (!signIn.session) fail('Auth: login', 'no session')
else ok('Auth: login', testUser)

// 6. Deposit RPC (pending flow if admin_setup ran)
if (signIn?.session) {
  const { error: depErr } = await supabase.rpc('submit_deposit', {
    p_amount: 100,
    p_channel_type: 'bank',
  })
  if (depErr) {
    if (depErr.message.includes('Could not find')) fail('Wallet: submit_deposit', 'run auth_setup.sql / database.sql')
    else warn('Wallet: submit_deposit', depErr.message)
  } else ok('Wallet: submit_deposit')

  const gameId = games?.[0]?.id ?? 1
  const { error: betErr } = await supabase.rpc('submit_bets', {
    p_games_id: gameId,
    p_issue: '99999999999',
    p_bets: [{ category_name: '两面盘', label: 'คู่', amount: 10, odds: '1.98' }],
  })
  if (betErr) {
    if (betErr.message.includes('Could not find')) fail('Betting: submit_bets', 'run supabase/submit_bet.sql')
    else warn('Betting: submit_bets', betErr.message.slice(0, 120))
  } else ok('Betting: submit_bets')
}

// Cleanup test auth user (sign out)
await supabase.auth.signOut()

const fails = results.filter((r) => r.status === 'FAIL').length
const warns = results.filter((r) => r.status === 'WARN').length
console.log(`\n=== Summary: ${results.filter((r) => r.status === 'OK').length} OK, ${warns} WARN, ${fails} FAIL ===`)
process.exit(fails > 0 ? 1 : 0)
