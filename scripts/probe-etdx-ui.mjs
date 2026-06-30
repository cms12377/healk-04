const js = await fetch('https://th6688.vip/assets/KuaiSan-BoN8nyf6.js').then((r) => r.text())

const markers = ['二同单选', 'split("|")', 'g.code', 'g.group', '11|1']
for (const m of markers) {
  let idx = 0
  let count = 0
  while ((idx = js.indexOf(m, idx)) >= 0 && count < 3) {
    console.log(`\n--- ${m} @ ${idx} ---`)
    console.log(js.slice(Math.max(0, idx - 150), idx + 350).replace(/\s+/g, ' '))
    idx += m.length
    count++
  }
}
