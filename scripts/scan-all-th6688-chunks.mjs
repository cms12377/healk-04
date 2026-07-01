/**
 * Scan ALL th6688.vip JS chunks for win-rate / member-control terms.
 */
const INDEX = 'https://th6688.vip/assets/index-CxE4V138.js'
const TERMS = [
  'win_rate', 'winRate', 'random_win', '胜率', '杀率', '杀号', '控奖', '控单',
  'kill', 'biased', 'casino', 'draw_mode', 'preset', 'control_member', 'member_rate',
  'day_win', 'profit_control', 'randomWinRate',
]

const indexJs = await (await fetch(INDEX)).text()
const chunks = [...new Set([...indexJs.matchAll(/assets\/([A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]))]
console.log(`Scanning ${chunks.length} chunks...\n`)

let totalHits = 0
const hitFiles = []

for (const chunk of chunks) {
  try {
    const js = await (await fetch(`https://th6688.vip/assets/${chunk}`, { signal: AbortSignal.timeout(12000) })).text()
    const fileHits = []
    for (const t of TERMS) {
      if (js.includes(t)) fileHits.push(t)
    }
    if (fileHits.length) {
      totalHits += fileHits.length
      hitFiles.push({ chunk, hits: fileHits })
    }
  } catch {
    /* skip */
  }
}

if (hitFiles.length === 0) {
  console.log('Result: NO win-rate / member-control terms in any th6688.vip frontend chunk.')
} else {
  for (const f of hitFiles) console.log(f.chunk, '->', f.hits.join(', '))
}

// Collect all unique API paths across chunks
const allApis = new Set()
for (const chunk of chunks.slice(0, 40)) {
  try {
    const js = await (await fetch(`https://th6688.vip/assets/${chunk}`, { signal: AbortSignal.timeout(8000) })).text()
    for (const m of js.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)) allApis.add(m[0])
  } catch { /* skip */ }
}
console.log('\n=== Sample API paths from first 40 chunks ===')
for (const a of [...allApis].sort()) console.log(a)
