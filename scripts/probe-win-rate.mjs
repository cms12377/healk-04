/**
 * Probe th6688 agent SPA + laoadmin public API for member win-rate controls.
 */
const TH6688 = 'https://th6688.vip/assets'
const LAO = 'https://laoadmin.top'

const TH6688_FILES = [
  'index-CxE4V138.js',
  'HuiYuan-BKqcQ5I_.js',
  'ChongZhi-CqmUF6Qp.js',
  'BettingHistory-C_W-F4kZ.js',
  'RechargeAdmin-BfHzH30b.js',
  'HyChong-CHG8NDAQ.js',
  'HyTou-Cm4RkHuk.js',
]

const KEYWORDS = [
  'win_rate',
  'winRate',
  'random_win',
  '胜率',
  '杀率',
  '控',
  'kill',
  'control',
  'draw_mode',
  'next_draw',
  'casino',
  'biased',
]

async function scanJs(label, url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const js = await res.text()
  const hits = []
  for (const kw of KEYWORDS) {
    const re = new RegExp(`.{0,50}${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.{0,50}`, 'gi')
    for (const m of js.matchAll(re)) {
      hits.push({ kw, ctx: m[0].replace(/\s+/g, ' ').slice(0, 120) })
    }
  }
  const apis = [
    ...new Set([...js.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0])),
  ].filter((a) => /win|rate|control|draw|kill|member|user|game/i.test(a))

  console.log(`\n=== ${label} (${js.length} bytes) ===`)
  if (hits.length === 0) console.log('  keyword hits: (none)')
  else {
    console.log('  keyword hits:')
    for (const h of hits.slice(0, 15)) console.log(`    [${h.kw}] ${h.ctx}`)
    if (hits.length > 15) console.log(`    ... +${hits.length - 15} more`)
  }
  console.log('  related APIs:', apis.length ? apis.join(', ') : '(none)')
  return { hits: hits.length, apis }
}

console.log('=== Win-rate / control probe ===\n')

let th6688Total = 0
for (const f of TH6688_FILES) {
  try {
    const r = await scanJs(`th6688:${f}`, `${TH6688}/${f}`)
    th6688Total += r.hits
  } catch (e) {
    console.log(`\n=== th6688:${f} === ERR`, e.message)
  }
}

// laoadmin games + current_game
for (const [code, id] of [
  ['df_k3', 2],
  ['df_pk10', 1],
]) {
  const res = await fetch(`${LAO}/api/game/current_game?games_id=${id}`, { method: 'POST' })
  const json = await res.json()
  const d = json?.data ?? {}
  console.log(`\n=== laoadmin current_game ${code} keys ===`)
  console.log(' ', Object.keys(d).sort().join(', '))
  for (const [k, v] of Object.entries(d)) {
    if (/win|rate|control|mode|kill|random|casino/i.test(k)) console.log(`   ${k}=`, v)
  }
}

// Scan main th6688 member bundle for win rate
try {
  const idx = await (await fetch(`${TH6688}/index-CxE4V138.js`)).text()
  const chunks = [...new Set([...idx.matchAll(/assets\/([A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))]
  console.log(`\n=== th6688 index references ${chunks.length} chunks ===`)
  let memberHits = 0
  for (const c of chunks.filter((x) => /HuiYuan|Member|User|Game|Lottery|My|Admin/i.test(x)).slice(0, 20)) {
    try {
      const r = await scanJs(`th6688-chunk:${c}`, `${TH6688}/${c}`)
      memberHits += r.hits
    } catch {
      /* skip */
    }
  }
  console.log(`\nSummary th6688 agent files keyword hits: ${th6688Total}`)
  console.log(`Summary th6688 member-related chunks hits: ${memberHits}`)
} catch (e) {
  console.log('index scan err', e.message)
}
