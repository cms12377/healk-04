const TH = 'https://th6688.vip'

async function head(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return r.status
  } catch (e) {
    return `ERR:${e.message}`
  }
}

const codes = ['df_pk10', 'df_pk10_3', 'df_pk10_5', 'df_k3', 'xam_6', 'xy_28', 'df_ssc']

// Probe homepage JS for asset references
const html = await (await fetch(`${TH}/`)).text()
const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/)
console.log('main js:', jsMatch?.[1])
if (jsMatch) {
  const js = await (await fetch(`${TH}${jsMatch[1]}`)).text()
  const assets = [...js.matchAll(/\/assets\/[^"'`\s]+\.(png|jpg|webp)/g)].map((m) => m[0])
  const unique = [...new Set(assets)]
  console.log('\nAll PNG/JPG in bundle:', unique.length)
  for (const a of unique.filter((u) => /pk10|k3|ssc|xam|xy|game|lottery|hot/i.test(u))) {
    console.log(' ', a, await head(`${TH}${a}`))
  }
}

console.log('\n--- DB paths ---')
for (const c of codes) {
  const u = `${TH}/assets/games/${c}.png`
  console.log(await head(u), u)
}
