const js = await (await fetch('https://th6688.vip/assets/index-CxE4V138.js')).text()

// Find admin menu section - look for route names cluster
const idx = js.indexOf('rechargeAdmin')
console.log('Router block around rechargeAdmin:')
console.log(js.slice(idx - 200, idx + 2500))

// All api paths in main bundle
const apis = [...js.matchAll(/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0])
const unique = [...new Set(apis)].sort()
console.log('\n=== API paths in main bundle (' + unique.length + ') ===')
for (const a of unique.filter((x) => /recharge|withdraw|bet|user|agent|member|game|money|order|admin/i.test(x))) {
  console.log(' ', a)
}
