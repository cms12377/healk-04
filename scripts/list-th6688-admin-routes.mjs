const js = await (await fetch('https://th6688.vip/assets/index-CxE4V138.js')).text()
const routes = [...js.matchAll(/path:"(\/[^"]+)"/g)].map((m) => m[1])
const admin = routes.filter((r) =>
  /Admin|Chong|huiYuan|hy[A-Z]|bettingHistory|chongZhi|Identity|BindAddress/i.test(r),
)
console.log('=== th6688 staff/agent routes ===')
for (const r of [...new Set(admin)].sort()) console.log(r)

// Also find menu labels in Thai/Chinese locale
const thBlock = js.match(/a19:[^,]{0,200}/)?.[0]
console.log('\nLocale sample:', thBlock?.slice(0, 150))

// Fetch RechargeAdmin component for API calls
const chunk = 'RechargeAdmin-BfHzH30b.js'
const chunkJs = await (await fetch(`https://th6688.vip/assets/${chunk}`)).text()
const apis = [...chunkJs.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0])
console.log('\nRechargeAdmin APIs:', [...new Set(apis)])

const huiYuan = await (await fetch('https://th6688.vip/assets/HuiYuan-BKqcQ5I_.js')).text()
const huiApis = [...huiYuan.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0])
console.log('HuiYuan APIs:', [...new Set(huiApis)])

const chong = await (await fetch('https://th6688.vip/assets/ChongZhi-CqmUF6Qp.js')).text()
const chongApis = [...chong.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0])
console.log('ChongZhi APIs:', [...new Set(chongApis)])
