/**
 * Probe laoadmin.top public API routes to infer admin panel structure.
 */
const BASE = 'https://laoadmin.top'

const paths = [
  '/api/game/games',
  '/api/user/user/index',
  '/api/user/user/login',
  '/api/deposit/deposit/index',
  '/api/withdraw/withdraw/index',
  '/api/bet/bet/index',
  '/api/member/member/index',
  '/api/agent/agent/index',
  '/api/order/order/index',
  '/api/finance/recharge/index',
  '/api/finance/withdraw/index',
  '/api/admin/index',
  '/api/admin/menu',
  '/api/index/index',
  '/api/common/config',
  '/api/site/config',
  '/api/game/draw/index',
  '/api/game/issue/index',
  '/api/game/result/index',
  '/api/game/control/index',
  '/api/cms/setting/index',
  '/api/setting/index',
  '/api/banner/banner/index',
  '/api/notice/notice/index',
  '/api/report/report/index',
  '/api/statistics/index',
  '/api/dashboard/index',
  '/api/user/moneylog/index',
  '/api/money/moneylog/index',
]

async function probe(path) {
  try {
    const r = await fetch(BASE + path, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    const text = await r.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* html */
    }
    const preview = json
      ? JSON.stringify(json).slice(0, 120)
      : text.slice(0, 80).replace(/\s+/g, ' ')
    return { status: r.status, ok: json?.code === 1 || json?.code === 0, code: json?.code, preview }
  } catch (e) {
    return { status: 0, error: e.message }
  }
}

console.log('=== laoadmin.top API probe ===\n')
for (const path of paths) {
  const res = await probe(path)
  const tag = res.error
    ? `ERR ${res.error}`
    : res.ok
      ? 'OK'
      : `HTTP ${res.status} code=${res.code ?? '?'}`
  console.log(`${tag.padEnd(20)} ${path}`)
  if (res.preview && !res.error) console.log(`  ${res.preview}`)
}
