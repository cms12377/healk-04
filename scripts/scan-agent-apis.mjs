const chunks = [
  'PopupView-Cevjsv2b.js',
  'huiyuan-nd2VcbFz.js',
  'RechargeAdmin-BfHzH30b.js',
  'DepositAdmin-BsDK4d4V.js',
  'ChongZhi-CqmUF6Qp.js',
  'BettingHistory-C_W-F4kZ.js',
  'IdentityCard-Rj-l_TCl.js',
  'HyChong-CHG8NDAQ.js',
  'HyTixian-CyzuseeF.js',
  'HyTou-Cm4RkHuk.js',
  'BindAddress-BLQg3YZl.js',
]

for (const c of chunks) {
  const js = await (await fetch(`https://th6688.vip/assets/${c}`)).text()
  const apis = [...new Set([...js.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0]))]
  console.log(`\n${c}`)
  console.log('  APIs:', apis.join(', ') || '(none)')
  if (c === 'PopupView-Cevjsv2b.js') {
    const i = js.indexOf('day_win')
    if (i >= 0) console.log('  day_win ctx:', js.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, ' '))
  }
}
