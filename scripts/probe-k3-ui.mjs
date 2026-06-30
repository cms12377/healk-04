const js = await fetch('https://th6688.vip/assets/KuaiSan-BoN8nyf6.js').then((r) => r.text())

function extractComponent(name) {
  const key = `__name:"${name}"`
  const idx = js.indexOf(key)
  if (idx < 0) return console.log(`Component ${name} not found`)
  console.log(`\n===== ${name} =====`)
  console.log(js.slice(idx, idx + 2500))
}

for (const c of ['SanBuTong', 'ErTongDan', 'LiangGuan', 'HeZhi', 'KuaiSan']) {
  extractComponent(c)
}

// grid usage summary
for (const m of js.matchAll(/grid-cols-\d/g)) {
  // count only
}
const counts = {}
for (const m of js.matchAll(/grid-cols-\d+/g)) {
  counts[m[0]] = (counts[m[0]] || 0) + 1
}
console.log('\ngrid usage:', counts)
