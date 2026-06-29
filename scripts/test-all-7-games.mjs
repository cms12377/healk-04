/**
 * Full E2E test — all 7 games: bet → force advance → settle
 * Prerequisites: run supabase/rpc_test_prereq.sql in Supabase SQL Editor
 * Run: node scripts/test-all-7-games.mjs
 */
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
  console.error('FAIL: missing .env Supabase credentials')
  process.exit(1)
}

const supabase = createClient(url, key)

const ALL_GAMES = [
  'df_pk10',
  'df_pk10_3',
  'df_pk10_5',
  'df_k3',
  'xam_6',
  'xy_28',
  'df_ssc',
]

/** Representative play_item bet_content per game type */
const PICK_BET_CONTENT = {
  df_pk10: 'lm_r1_big',
  df_pk10_3: 'lm_r1_big',
  df_pk10_5: 'lm_r1_big',
  df_k3: 'total_big',
  xam_6: 'tm_1',
  xy_28: 'ball1_5',
  df_ssc: 'ball1_5',
}

const STAKE = 1000
const results = []

function ok(game, step, detail = '') {
  results.push({ game, step, s: 'OK', detail })
  console.log(`  ✅ ${step}${detail ? ` — ${detail}` : ''}`)
}
function fail(game, step, detail = '') {
  results.push({ game, step, s: 'FAIL', detail })
  console.log(`  ❌ ${step}${detail ? ` — ${detail}` : ''}`)
}

async function getOpenIssue(gamesId) {
  const { data } = await supabase
    .from('game_issues')
    .select('issue, draw_time')
    .eq('games_id', gamesId)
    .eq('status', 0)
    .order('draw_time', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function findPlayItem(gamesId, betContent) {
  let { data } = await supabase
    .from('play_items')
    .select('id, bet_content, label, odds')
    .eq('games_id', gamesId)
    .eq('bet_content', betContent)
    .eq('status', 1)
    .maybeSingle()

  if (!data) {
    const alt = betContent.replace(/^tm_0/, 'tm_')
    if (alt !== betContent) {
      ;({ data } = await supabase
        .from('play_items')
        .select('id, bet_content, label, odds')
        .eq('games_id', gamesId)
        .eq('bet_content', alt)
        .eq('status', 1)
        .maybeSingle())
    }
  }

  if (!data) {
    const { data: any } = await supabase
      .from('play_items')
      .select('id, bet_content, label, odds')
      .eq('games_id', gamesId)
      .eq('status', 1)
      .limit(1)
      .maybeSingle()
    return any
  }
  return data
}

async function ensureOpenIssue(game) {
  const now = Math.floor(Date.now() / 1000)
  let issue = await getOpenIssue(game.id)

  if (!issue) {
    fail(game.code, 'open issue', 'none — run fix_game_issues_countdown.sql')
    return null
  }

  if (issue.draw_time <= now) {
    const { data: adv, error } = await supabase.rpc('advance_game_round', {
      p_games_id: game.id,
    })
    if (error) {
      fail(game.code, 'advance (expired sync)', error.message)
      return null
    }
    if (!adv?.skipped) {
      ok(game.code, 'advance (expired sync)', `new issue ${adv.new_issue}`)
    }
    issue = await getOpenIssue(game.id)
  }

  const left = issue ? issue.draw_time - Math.floor(Date.now() / 1000) : 0
  if (!issue || left <= 0) {
    fail(game.code, 'open issue', `not open (left=${left}s)`)
    return null
  }
  return issue
}

async function testGame(game, userId) {
  console.log(`\n--- ${game.code} (${game.name}) ---`)

  const issue = await ensureOpenIssue(game)
  if (!issue) return

  const pickContent = PICK_BET_CONTENT[game.code]
  const playItem = await findPlayItem(game.id, pickContent)
  if (!playItem) {
    fail(game.code, 'play_item', `missing ${pickContent}`)
    return
  }
  ok(game.code, 'play_item', `${playItem.bet_content} odds=${playItem.odds}`)

  const { error: betErr } = await supabase.rpc('submit_bets', {
    p_games_id: game.id,
    p_issue: issue.issue,
    p_bets: [
      {
        amount: STAKE,
        play_item_id: playItem.id,
        bet_content: playItem.bet_content,
        label: playItem.label,
        odds: playItem.odds,
        category_name: 'test',
        group_name: 'test',
      },
    ],
  })

  if (betErr) {
    fail(game.code, 'submit_bets', betErr.message)
    return
  }
  ok(game.code, 'submit_bets', `${STAKE} ฿ issue ${issue.issue}`)

  const { data: pendingBet } = await supabase
    .from('bet_records')
    .select('id, status, bet_content')
    .eq('user_id', userId)
    .eq('games_id', game.id)
    .eq('issue', issue.issue)
    .eq('status', '0')
    .maybeSingle()

  if (!pendingBet) {
    fail(game.code, 'bet_records', 'pending row missing')
    return
  }
  ok(game.code, 'bet_records', `id=${pendingBet.id} pending`)

  const betIssue = issue.issue

  const { data: adv, error: advErr } = await supabase.rpc('test_force_advance', {
    p_games_id: game.id,
  })

  if (advErr) {
    if (advErr.message.includes('Could not find')) {
      fail(game.code, 'test_force_advance', 'run updated rpc_test_prereq.sql')
    } else {
      fail(game.code, 'test_force_advance', advErr.message)
    }
    return
  }

  ok(
    game.code,
    'draw + settle',
    `result=${adv.result} settled=${adv.settled} win=${adv.bet_win ?? '?'}`,
  )

  const { data: settledBet } = await supabase
    .from('bet_records')
    .select('status, is_win, win_amount')
    .eq('id', pendingBet.id)
    .maybeSingle()

  if (settledBet?.status === '1') {
    ok(
      game.code,
      'settled',
      settledBet.is_win === '1'
        ? `WIN +${settledBet.win_amount}`
        : `LOSE (0)`,
    )
  } else {
    fail(game.code, 'settled', `status=${settledBet?.status ?? 'missing'}`)
  }

  const { data: draw } = await supabase
    .from('draw_results')
    .select('result')
    .eq('games_id', game.id)
    .eq('issue', betIssue)
    .maybeSingle()

  if (draw) ok(game.code, 'draw_results', draw.result)
  else fail(game.code, 'draw_results', 'missing')

  const newIssue = await getOpenIssue(game.id)
  if (newIssue && newIssue.issue !== betIssue) {
    ok(game.code, 'new issue', newIssue.issue)
  } else {
    fail(game.code, 'new issue', 'not rotated')
  }
}

// ---------------------------------------------------------------------------
console.log('=== All 7 Games E2E Test ===')
console.log(`Project: ${url}\n`)

const missingForce = await supabase.rpc('test_force_advance', { p_games_id: 1 })
if (
  missingForce.error?.message?.includes('Could not find') ||
  missingForce.error?.code === 'PGRST202'
) {
  console.error('⛔ Run supabase/rpc_test_prereq.sql first (includes test_force_advance)\n')
  process.exit(1)
}

const { data: games, error: gamesErr } = await supabase
  .from('games')
  .select('id, code, name')
  .in('code', ALL_GAMES)
  .order('id')

if (gamesErr || !games?.length) {
  console.error('FAIL load games:', gamesErr?.message)
  process.exit(1)
}

if (games.length < 7) {
  console.warn(`WARN: only ${games.length}/7 games in DB`)
}

const testUser = `e2e7_${Date.now()}`
const testEmail = `${testUser}@pklotery.local`
const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
  email: testEmail,
  password: 'E2eTest123!',
  options: { data: { username: testUser, nickname: testUser } },
})

if (signUpErr || !signUp.session) {
  console.error('FAIL auth:', signUpErr?.message ?? 'no session')
  process.exit(1)
}
console.log(`Auth: ${testUser}`)
await new Promise((r) => setTimeout(r, 1200))

const { data: profile } = await supabase
  .from('users')
  .select('id, money')
  .eq('auth_user_id', signUp.session.user.id)
  .single()

const topupAmount = STAKE * ALL_GAMES.length * 2
const { data: balance, error: topErr } = await supabase.rpc('test_wallet_topup', {
  p_amount: topupAmount,
})
if (topErr) {
  console.error('FAIL topup:', topErr.message)
  process.exit(1)
}
console.log(`Wallet: ${balance} ฿ (need ~${STAKE * ALL_GAMES.length})\n`)

for (const game of games) {
  await testGame(game, profile.id)
}

await supabase.auth.signOut()

const byGame = {}
for (const r of results) {
  if (!byGame[r.game]) byGame[r.game] = { OK: 0, FAIL: 0 }
  byGame[r.game][r.s]++
}

console.log('\n=== Per-game summary ===')
for (const code of ALL_GAMES) {
  const s = byGame[code]
  if (!s) {
    console.log(`  ${code}: SKIP (not in DB)`)
  } else if (s.FAIL > 0) {
    console.log(`  ${code}: ❌ ${s.FAIL} fail`)
  } else {
    console.log(`  ${code}: ✅ ${s.OK} checks passed`)
  }
}

const fails = results.filter((r) => r.s === 'FAIL').length
const oks = results.filter((r) => r.s === 'OK').length
console.log(`\n=== Total: ${oks} OK, ${fails} FAIL (${games.length} games) ===`)
process.exit(fails > 0 ? 1 : 0)
