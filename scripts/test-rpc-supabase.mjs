/**
 * Live Supabase RPC tests — betting engine
 * Run: node scripts/test-rpc-supabase.mjs
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
  console.error('FAIL: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key)
const results = []

function ok(name, detail = '') {
  results.push({ s: 'OK', name, detail })
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ s: 'FAIL', name, detail })
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
}
function warn(name, detail = '') {
  results.push({ s: 'WARN', name, detail })
  console.log(`⚠️  ${name}${detail ? ` — ${detail}` : ''}`)
}
function info(name, detail = '') {
  console.log(`   ${name}${detail ? `: ${detail}` : ''}`)
}

async function rpcMissing(name, args = {}) {
  const { error } = await supabase.rpc(name, args)
  return (
    error?.message?.includes('Could not find the function') ||
    error?.code === 'PGRST202'
  )
}

console.log('=== Supabase RPC Live Test ===')
console.log(`Project: ${url}`)
console.log('')
console.log('⚠️  ก่อนรัน: เปิด supabase/rpc_test_prereq.sql ใน Supabase SQL Editor แล้ว Run')
console.log('')

// ---------------------------------------------------------------------------
// 1) RPC existence
// ---------------------------------------------------------------------------
console.log('--- 1) RPC deployed? ---')
for (const [name, args] of [
  ['advance_game_round', { p_games_id: 1 }],
  ['submit_bets', { p_games_id: 1, p_issue: 'x', p_bets: [] }],
]) {
  const missing = await rpcMissing(name, args)
  if (missing) fail(`RPC ${name}`, 'NOT FOUND — run supabase/game_betting.sql')
  else ok(`RPC ${name}`, 'exists')
}

const gameBettingMissing = await rpcMissing('advance_game_round', { p_games_id: 1 })
if (gameBettingMissing) {
  console.log('\n⛔ Stop: deploy game_betting.sql first, then re-run this script.\n')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 2) Load games + current issues
// ---------------------------------------------------------------------------
console.log('\n--- 2) Game issues ---')
const { data: games, error: gamesErr } = await supabase
  .from('games')
  .select('id, code, name')
  .in('code', ['df_pk10', 'df_k3', 'df_ssc'])
  .order('id')

if (gamesErr) {
  fail('Load games', gamesErr.message)
  process.exit(1)
}

const gameMap = Object.fromEntries(games.map((g) => [g.code, g]))

for (const code of ['df_pk10', 'df_k3', 'df_ssc']) {
  const g = gameMap[code]
  if (!g) {
    warn(`Game ${code}`, 'not in DB')
    continue
  }
  const { data: issue } = await supabase
    .from('game_issues')
    .select('issue, draw_time, status, bet_quick_amount')
    .eq('games_id', g.id)
    .eq('status', 0)
    .order('draw_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = Math.floor(Date.now() / 1000)
  const left = issue ? issue.draw_time - now : null
  info(
    code,
    issue
      ? `issue=${issue.issue} left=${left}s chips=${JSON.stringify(issue.bet_quick_amount)}`
      : 'no open issue',
  )
}

// ---------------------------------------------------------------------------
// 3) advance_game_round (anon allowed)
// ---------------------------------------------------------------------------
console.log('\n--- 3) advance_game_round ---')
const pk10 = gameMap.df_pk10
if (!pk10) {
  fail('advance_game_round', 'df_pk10 not found')
} else {
  const { data: beforeIssue } = await supabase
    .from('game_issues')
    .select('issue, draw_time')
    .eq('games_id', pk10.id)
    .eq('status', 0)
    .maybeSingle()

  const now = Math.floor(Date.now() / 1000)
  const isDue = beforeIssue && beforeIssue.draw_time <= now

  const { data: adv, error: advErr } = await supabase.rpc('advance_game_round', {
    p_games_id: pk10.id,
  })

  if (advErr) {
    if (advErr.message.includes('FOR UPDATE')) {
      fail('advance_game_round(df_pk10)', `${advErr.message} — run supabase/rpc_test_prereq.sql`)
    } else {
      fail('advance_game_round(df_pk10)', advErr.message)
    }
  } else if (adv?.skipped) {
    ok(
      'advance_game_round(df_pk10)',
      `skipped (${adv.reason ?? 'not_due'}) — ${adv.seconds_left ?? beforeIssue.draw_time - now}s left`,
    )
  } else {
    ok(
      'advance_game_round(df_pk10)',
      `drew ${adv.drawn_issue} → ${adv.result} | settled=${adv.settled} | new=${adv.new_issue}`,
    )

    const { data: draw } = await supabase
      .from('draw_results')
      .select('issue, result')
      .eq('games_id', pk10.id)
      .eq('issue', adv.drawn_issue)
      .maybeSingle()
    if (draw) ok('draw_results inserted', `${draw.issue} = ${draw.result}`)
    else fail('draw_results inserted', 'row missing after advance')
  }

  if (!isDue && !adv?.skipped) {
    warn('advance_game_round', 'advanced even though issue was not due — check draw_time')
  }
}

// ---------------------------------------------------------------------------
// 4) Auth + submit_bets
// ---------------------------------------------------------------------------
console.log('\n--- 4) submit_bets (authenticated) ---')
const testUser = `rpctest_${Date.now()}`
const testPass = 'RpcTest123!'
const testEmail = `${testUser}@pklotery.local`

const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
  email: testEmail,
  password: testPass,
  options: { data: { username: testUser, nickname: testUser } },
})

if (signUpErr || !signUp.session) {
  fail('Auth register', signUpErr?.message ?? 'no session — disable Confirm email in Supabase')
} else {
  ok('Auth register', testUser)
  await new Promise((r) => setTimeout(r, 1200))

  const { data: profile } = await supabase
    .from('users')
    .select('id, money')
    .eq('auth_user_id', signUp.session.user.id)
    .maybeSingle()

  if (!profile) fail('User profile', 'missing after register trigger')
  else info('Balance before', `${profile.money} ฿`)

  // Top up via test_wallet_topup (deployed via rpc_test_prereq.sql)
  const { data: topped, error: topErr } = await supabase.rpc('test_wallet_topup', {
    p_amount: 50000,
  })
  if (topErr) {
    if (topErr.message.includes('Could not find')) {
      warn('test_wallet_topup', 'run supabase/rpc_test_prereq.sql first')
    } else {
      warn('test_wallet_topup', topErr.message.slice(0, 80))
    }
  } else {
    ok('test_wallet_topup', `balance now ${topped} ฿`)
  }

  const { data: profileFunded } = await supabase
    .from('users')
    .select('money')
    .eq('auth_user_id', signUp.session.user.id)
    .maybeSingle()
  info('Balance after deposit', `${profileFunded?.money ?? 0} ฿`)

  const nowSec = Math.floor(Date.now() / 1000)

  /** Pick game with open issue (draw_time > now) for live bet tests */
  async function findOpenBetTarget() {
    for (const code of ['df_pk10', 'df_k3', 'df_ssc', 'xy_28', 'xam_6']) {
      const g = gameMap[code]
      if (!g) continue
      const { data: issue } = await supabase
        .from('game_issues')
        .select('issue, draw_time')
        .eq('games_id', g.id)
        .eq('status', 0)
        .maybeSingle()
      if (issue && issue.draw_time > nowSec) {
        const { data: playItem } = await supabase
          .from('play_items')
          .select('id, bet_content, label, odds, group_id')
          .eq('games_id', g.id)
          .eq('status', 1)
          .limit(1)
          .maybeSingle()
        if (playItem) return { game: g, issue, playItem }
      }
    }
    return null
  }

  const betTarget = await findOpenBetTarget()
  const k3 = gameMap.df_k3 ?? games[0]
  const { data: k3Issue } = await supabase
    .from('game_issues')
    .select('issue, draw_time')
    .eq('games_id', k3.id)
    .eq('status', 0)
    .maybeSingle()

  const { data: playItem } = await supabase
    .from('play_items')
    .select('id, bet_content, label, odds, group_id')
    .eq('games_id', k3.id)
    .eq('status', 1)
    .limit(1)
    .maybeSingle()

  const liveGame = betTarget?.game ?? k3
  const liveIssue = betTarget?.issue ?? k3Issue
  const livePlayItem = betTarget?.playItem ?? playItem

  if (betTarget) info('Open issue for bets', `${betTarget.game.code} ${betTarget.issue.issue}`)
  else warn('Open issue for bets', 'none open — run rpc_test_prereq.sql')

  if (!liveIssue || !livePlayItem) {
    fail('submit_bets setup', 'missing issue or play_item')
  } else {
    // 4a) Reject non-integer amount
    const { error: badAmtErr } = await supabase.rpc('submit_bets', {
      p_games_id: liveGame.id,
      p_issue: liveIssue.issue,
      p_bets: [
        {
          amount: 10.5,
          play_item_id: livePlayItem.id,
          bet_content: livePlayItem.bet_content,
          label: livePlayItem.label,
          odds: livePlayItem.odds,
          category_name: 'test',
        },
      ],
    })
    if (badAmtErr?.message?.includes('invalid bet amount')) {
      ok('submit_bets rejects decimal amount')
    } else if (badAmtErr?.message?.includes('betting closed')) {
      warn('submit_bets decimal amount', 'betting closed — run supabase/rpc_test_prereq.sql first')
    } else if (badAmtErr) {
      warn('submit_bets decimal amount', badAmtErr.message.slice(0, 100))
    } else {
      warn('submit_bets decimal amount', 'accepted (old submit_bets — run game_betting.sql)')
    }

    // 4b) Reject fake issue
    const { error: badIssueErr } = await supabase.rpc('submit_bets', {
      p_games_id: liveGame.id,
      p_issue: '00000000000',
      p_bets: [
        {
          amount: 1000,
          play_item_id: livePlayItem.id,
          bet_content: livePlayItem.bet_content,
          label: livePlayItem.label,
          odds: livePlayItem.odds,
          category_name: 'test',
        },
      ],
    })
    if (badIssueErr?.message?.includes('issue closed') || badIssueErr?.message?.includes('not found')) {
      ok('submit_bets rejects invalid issue')
    } else if (badIssueErr) {
      warn('submit_bets invalid issue', badIssueErr.message.slice(0, 100))
    } else {
      warn('submit_bets invalid issue', 'accepted fake issue (old RPC)')
    }

    // 4c) Credit test user for real bet (via direct balance bump if admin RPC missing)
    // Try submit with 1000 if balance allows; new users start with seed balance
    const { data: profile2 } = await supabase
      .from('users')
      .select('money')
      .eq('id', profile.id)
      .single()

    const stake = 1000
    const balanceNow = Number(profileFunded?.money ?? profile2?.money ?? 0)
    if (balanceNow < stake) {
      warn('submit_bets live bet', `balance ${balanceNow} < ${stake}`)
    } else {
      const beforeMoney = balanceNow
      const { error: betErr } = await supabase.rpc('submit_bets', {
        p_games_id: liveGame.id,
        p_issue: liveIssue.issue,
        p_bets: [
          {
            amount: stake,
            play_item_id: livePlayItem.id,
            bet_content: livePlayItem.bet_content,
            label: livePlayItem.label,
            odds: livePlayItem.odds,
            category_name: '和值',
            group_name: 'hz',
          },
        ],
      })

      if (betErr) {
        if (betErr.message.includes('betting closed')) {
          warn('submit_bets live bet', 'issue closed — run rpc_test_prereq.sql')
        } else {
          fail('submit_bets live bet', betErr.message)
        }
      } else {
        ok('submit_bets live bet', `${stake} ฿ on ${livePlayItem.label} ${liveGame.code} issue ${liveIssue.issue}`)

        const { data: afterProfile } = await supabase
          .from('users')
          .select('money, unsettled')
          .eq('id', profile.id)
          .single()

        const { data: betRow } = await supabase
          .from('bet_records')
          .select('id, amount, status, is_win, bet_content, play_item_id')
          .eq('user_id', profile.id)
          .eq('games_id', liveGame.id)
          .eq('issue', liveIssue.issue)
          .order('createtime', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (betRow) {
          ok('bet_records row', `id=${betRow.id} status=${betRow.status} content=${betRow.bet_content}`)
        } else {
          fail('bet_records row', 'not found after submit')
        }

        if (Number(afterProfile?.money) === beforeMoney - stake) {
          ok('Balance deducted', `${beforeMoney} → ${afterProfile.money}`)
        } else {
          warn('Balance deducted', `expected ${beforeMoney - stake}, got ${afterProfile?.money}`)
        }

        if (Number(afterProfile?.unsettled) >= stake) {
          ok('unsettled increased', String(afterProfile.unsettled))
        } else {
          warn('unsettled', String(afterProfile?.unsettled))
        }
      }
    }
  }
}

await supabase.auth.signOut()

// ---------------------------------------------------------------------------
// 5) advance k3 if due (settle test bet path)
// ---------------------------------------------------------------------------
console.log('\n--- 5) Round advance + settle (df_k3) ---')
const k3Game = gameMap.df_k3
if (k3Game) {
  const { data: k3IssueNow } = await supabase
    .from('game_issues')
    .select('issue, draw_time')
    .eq('games_id', k3Game.id)
    .eq('status', 0)
    .maybeSingle()

  const now2 = Math.floor(Date.now() / 1000)
  if (k3IssueNow && k3IssueNow.draw_time > now2) {
    info('df_k3 countdown', `${k3IssueNow.draw_time - now2}s — force-expire via note below`)
    warn(
      'Settle test',
      'issue still open — to test settle, run fix_game_issues_countdown.sql OR wait for countdown',
    )
  } else {
    const { data: adv2, error: adv2Err } = await supabase.rpc('advance_game_round', {
      p_games_id: k3Game.id,
    })
    if (adv2Err) {
      if (adv2Err.message.includes('duplicate key')) {
        fail('advance_game_round(df_k3)', `${adv2Err.message} — re-run supabase/rpc_test_prereq.sql (issue numbering fix)`)
      } else {
        fail('advance_game_round(df_k3)', adv2Err.message)
      }
    } else if (adv2?.skipped) ok('advance_game_round(df_k3)', `skipped — ${adv2.seconds_left}s left`)
    else {
      ok('advance_game_round(df_k3)', `result=${adv2.result} settled=${adv2.settled}`)
      const { data: settledBets } = await supabase
        .from('bet_records')
        .select('status, is_win, win_amount')
        .eq('games_id', k3Game.id)
        .eq('issue', adv2.drawn_issue)
        .eq('status', '1')
        .limit(5)
      if (settledBets?.length) {
        ok('Bets settled', settledBets.map((b) => `win=${b.is_win} amt=${b.win_amount}`).join(', '))
      } else {
        info('Bets settled', 'no pending bets for that issue')
      }
    }
  }
}

// Summary
const fails = results.filter((r) => r.s === 'FAIL').length
const warns = results.filter((r) => r.s === 'WARN').length
const oks = results.filter((r) => r.s === 'OK').length
console.log(`\n=== Summary: ${oks} OK, ${warns} WARN, ${fails} FAIL ===`)

if (fails > 0) process.exit(1)
