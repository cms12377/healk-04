/**
 * User walkthrough simulation — key bet types per game (submit + settle)
 * Run: node scripts/test-user-walkthrough.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const STAKE = 1000

/** Each scenario mirrors a user picking a bet type in the UI */
const SCENARIOS = [
  {
    code: 'df_pk10',
    label: 'PK10 — สองด้าน + ผลรวม + อันดับ',
    picks: [
      { bet_content: 'lm_r1_big', group: 'lm' },
      { bet_content: 'gy_sum_10', group: 'gy' },
      { bet_content: 'n5', group: 'r5' },
    ],
  },
  {
    code: 'df_pk10_3',
    label: 'PK10 3min',
    picks: [{ bet_content: 'lm_r2_dragon', group: 'lm' }],
  },
  {
    code: 'df_pk10_5',
    label: 'PK10 5min',
    picks: [{ bet_content: 'gy_big', group: 'gy' }],
  },
  {
    code: 'df_k3',
    label: 'K3 — ผลรวม + combo',
    picks: [
      { bet_content: 'big', group: 'hz' },
      { bet_content: '123', group: 'sbdh', play_item_template: true },
      { bet_content: '112', group: 'etdx', play_item_template: true },
    ],
  },
  {
    code: 'xam_6',
    label: 'Mark Six — 特码/两面/肖',
    picks: [
      { bet_content: 'tm_7', group: 'tm' },
      { bet_content: 'big', group: 'tm' },
      { bet_content: 'red', group: 'tm' },
      { bet_content: 'rat', group: 'tx' },
      { bet_content: 'big', group: 'zm' },
    ],
  },
  {
    code: 'xy_28',
    label: 'Lucky28 — 整合/ลูก/ผลรวม',
    picks: [
      { bet_content: 'bigOdd', group: 'lm28' },
      { bet_content: 'ball1_big', group: 'ball1' },
      { bet_content: 'sum_14', group: 'hz28' },
    ],
  },
  {
    code: 'df_ssc',
    label: 'SSC — 总和/ลูก',
    picks: [
      { bet_content: 'sum_dragon', group: 'sum' },
      { bet_content: 'ball1_3', group: 'ball1' },
      { bet_content: 'b3_odd', group: 'b3' },
    ],
  },
]

const UI_CHECKS = [
  { code: 'df_pk10', minGroups: 13, minItems: 175 },
  { code: 'df_k3', minGroups: 7, minItems: 39 },
  { code: 'xam_6', minGroups: 4, minItems: 120 },
  { code: 'xy_28', minGroups: 5, minItems: 85 },
  { code: 'df_ssc', minGroups: 7, minItems: 85 },
]

let fails = 0
function ok(msg) {
  console.log(`  ✅ ${msg}`)
}
function bad(msg) {
  console.log(`  ❌ ${msg}`)
  fails++
}

async function findItem(gamesId, pick) {
  const { data: group } = await supabase
    .from('play_groups')
    .select('id')
    .eq('games_id', gamesId)
    .eq('code', pick.group)
    .maybeSingle()

  if (pick.play_item_template) {
    const q = supabase
      .from('play_items')
      .select('id, bet_content, label, odds')
      .eq('games_id', gamesId)
      .eq('status', 1)
      .like('bet_content', '%,%')
    if (group) q.eq('group_id', group.id)
    const { data } = await q.limit(1).maybeSingle()
    return data ? { ...data, submit_bc: pick.bet_content } : null
  }

  const q = supabase
    .from('play_items')
    .select('id, bet_content, label, odds')
    .eq('games_id', gamesId)
    .eq('bet_content', pick.bet_content)
    .eq('status', 1)
  if (group) q.eq('group_id', group.id)
  const { data } = await q.maybeSingle()
  return data ? { ...data, submit_bc: pick.bet_content } : null
}

async function ensureIssue(gameId) {
  const now = Math.floor(Date.now() / 1000)
  let { data: issue } = await supabase
    .from('game_issues')
    .select('issue, draw_time')
    .eq('games_id', gameId)
    .eq('status', 0)
    .maybeSingle()
  if (!issue || issue.draw_time <= now) {
    await supabase.rpc('advance_game_round', { p_games_id: gameId })
    ;({ data: issue } = await supabase
      .from('game_issues')
      .select('issue, draw_time')
      .eq('games_id', gameId)
      .eq('status', 0)
      .maybeSingle())
  }
  return issue
}

async function checkCatalog() {
  console.log('\n=== UI catalog (what user sees) ===')
  for (const spec of UI_CHECKS) {
    const { data: game } = await supabase.from('games').select('id').eq('code', spec.code).single()
    const { data: groups } = await supabase
      .from('play_groups')
      .select('id')
      .eq('games_id', game.id)
    const { count } = await supabase
      .from('play_items')
      .select('id', { count: 'exact', head: true })
      .eq('games_id', game.id)
      .eq('status', 1)
    const { data: issue } = await supabase
      .from('game_issues')
      .select('draw_time, bet_quick_amount')
      .eq('games_id', game.id)
      .eq('status', 0)
      .maybeSingle()
    const left = issue ? issue.draw_time - Math.floor(Date.now() / 1000) : -1

    if ((groups?.length ?? 0) >= spec.minGroups && (count ?? 0) >= spec.minItems) {
      ok(`${spec.code}: ${count} items, countdown ${left}s open`)
    } else {
      bad(`${spec.code}: groups=${groups?.length} items=${count}`)
    }
    if (left <= 0) {
      console.log(`  ⚠️  ${spec.code}: countdown expired — UI auto-refreshes via advance_game_round (or run fix_game_issues_countdown.sql)`)
    }
  }
}

async function main() {
  console.log('=== User Walkthrough Test ===')

  const testUser = `walk_${Date.now()}`
  const testEmail = `${testUser}@pklotery.local`
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: 'E2eTest123!',
    options: { data: { username: testUser, nickname: testUser } },
  })
  if (signUpErr || !signUp.session) {
    console.error('Auth failed', signUpErr?.message ?? 'no session')
    process.exit(1)
  }
  await new Promise((r) => setTimeout(r, 1200))
  await supabase.rpc('test_wallet_topup', { p_amount: 50000 })

  await checkCatalog()

  console.log('\n=== Bet + settle per user action ===')
  for (const scenario of SCENARIOS) {
    console.log(`\n--- ${scenario.label} (${scenario.code}) ---`)
    const { data: game } = await supabase.from('games').select('id, name').eq('code', scenario.code).single()
    let issue = await ensureIssue(game.id)
    if (!issue) {
      bad('no open issue')
      continue
    }

    for (const pick of scenario.picks) {
      issue = await ensureIssue(game.id)
      const item = await findItem(game.id, pick)
      if (!item) {
        bad(`missing pick ${pick.bet_content} (${pick.group})`)
        continue
      }

      const submitBc = item.submit_bc
      const { error: betErr } = await supabase.rpc('submit_bets', {
        p_games_id: game.id,
        p_issue: issue.issue,
        p_bets: [
          {
            amount: STAKE,
            play_item_id: item.id,
            bet_content: submitBc,
            label: item.label,
            odds: item.odds,
            group_name: pick.group,
          },
        ],
      })
      if (betErr) {
        bad(`submit ${submitBc}: ${betErr.message}`)
        continue
      }

      const { data: adv, error: advErr } = await supabase.rpc('test_force_advance', {
        p_games_id: game.id,
      })
      if (advErr) {
        bad(`settle ${submitBc}: ${advErr.message}`)
        continue
      }

      const { data: rec } = await supabase
        .from('bet_records')
        .select('bet_content, status, is_win')
        .eq('games_id', game.id)
        .eq('bet_content', submitBc)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (rec?.status === '1') {
        ok(`${submitBc} → settled (${rec.is_win === '1' ? 'WIN' : 'LOSE'}) result=${adv.result}`)
      } else {
        bad(`${submitBc}: not settled`)
      }
    }
  }

  await supabase.auth.signOut()
  console.log(`\n=== Done: ${fails} failure(s) ===`)
  process.exit(fails > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
