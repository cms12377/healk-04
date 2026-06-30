const BASE = 'https://th6688.vip/assets'
const chunks = [
  'RechargeAdmin-BfHzH30b.js',
  'DepositAdmin-BsDK4d4V.js',
  'BettingHistory-C_W-F4kZ.js',
  'HuiYuan-BKqcQ5I_.js',
  'ChongZhi-CqmUF6Qp.js',
  'HyChong-CHG8NDAQ.js',
  'HyTixian-CyzuseeF.js',
  'HyTou-Cm4RkHuk.js',
  'BindAddress-BLQg3YZl.js',
  'IdentityCard-Rj-l_TCl.js',
]

for (const file of chunks) {
  try {
    const js = await (await fetch(`${BASE}/${file}`, { signal: AbortSignal.timeout(12000) })).text()
    const apis = [...js.matchAll(/["'](\/api\/[^"']+)["']/g)].map((m) => m[1])
    const posts = [...js.matchAll(/\.post\(["']([^"']+)["']/g)].map((m) => m[1])
    const gets = [...js.matchAll(/\.get\(["']([^"']+)["']/g)].map((m) => m[1])
    const titles = [...js.matchAll(/title:["']([^"']{2,40})["']/g)].map((m) => m[1])
    console.log(`\n=== ${file.replace(/-.+\.js$/, '')} ===`)
    console.log('  APIs:', [...new Set([...apis, ...posts, ...gets])].slice(0, 12).join(', ') || '(none found)')
    console.log('  titles:', [...new Set(titles)].slice(0, 6).join(' | ') || '(none)')
  } catch (e) {
    console.log(`\n=== ${file} === ERR`, e.message)
  }
}
