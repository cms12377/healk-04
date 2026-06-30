/**
 * Extract th6688 admin/agent hash routes from production JS bundle.
 */
const SITE = 'https://th6688.vip'

const html = await (await fetch(SITE)).text()
const scriptSrc = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1])
console.log('Scripts:', scriptSrc)

const adminPatterns = [
  /rechargeAdmin/gi,
  /depositAdmin/gi,
  /bettingHistory/gi,
  /huiYuan/gi,
  /chongZhi/gi,
  /hyChong/gi,
  /hyTixian/gi,
  /hyTou/gi,
  /agent/gi,
  /Admin/gi,
  /管理/g,
  /充值/g,
  /提现/g,
  /会员/g,
  /游戏/g,
]

const found = new Set()

for (const src of scriptSrc.slice(0, 5)) {
  const url = src.startsWith('http') ? src : SITE + (src.startsWith('/') ? '' : '/') + src
  try {
    const js = await (await fetch(url, { signal: AbortSignal.timeout(15000) })).text()
    console.log(`\n=== ${url} (${js.length} bytes) ===`)
    for (const pat of adminPatterns) {
      let m
      while ((m = pat.exec(js)) !== null) {
        const ctx = js.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' ')
        found.add(`${pat.source}: ...${ctx}...`)
      }
    }
  } catch (e) {
    console.log('skip', url, e.message)
  }
}

console.log('\n=== Admin route contexts ===')
for (const f of [...found].slice(0, 40)) console.log(f)

// laoadmin authenticated API discovery (common ThinkPHP modules)
const BASE = 'https://laoadmin.top'
const modules = [
  'recharge', 'withdraw', 'bet', 'user', 'game', 'agent', 'finance',
  'money', 'order', 'report', 'dashboard', 'notice', 'banner', 'cms',
]
const actions = ['index', 'lists', 'list', 'pending', 'audit']

console.log('\n=== laoadmin module probe (401 = exists) ===')
for (const mod of modules) {
  for (const act of ['index', 'lists']) {
    const path = `/api/${mod}/${mod}/${act}`
    try {
      const j = await (await fetch(BASE + path, { signal: AbortSignal.timeout(5000) })).json()
      if (j.code === 401 || j.code === 1) {
        console.log(`${j.code === 401 ? 'AUTH' : 'OK  '} ${path}`)
      }
    } catch {
      /* 404 */
    }
  }
}
