/**
 * Probe th6688 service page API and frontend
 */
const BASE = 'https://laoadmin.top'
const SITE = 'https://th6688.vip'

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers: { Accept: 'application/json', ...headers } })
  const text = await r.text()
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text.slice(0, 300) }
  }
}

async function getText(url) {
  const r = await fetch(url)
  return r.text()
}

// 1) Try common API paths
const apiPaths = [
  '/api/user/service',
  '/api/common/service_config',
  '/api/common/config',
  '/api/index/index',
  '/api/user/index',
]

console.log('=== laoadmin API ===')
for (const p of apiPaths) {
  const j = await getJson(BASE + p)
  console.log(p, j.code ?? 'html', JSON.stringify(j.data ?? j.msg ?? j._raw ?? '').slice(0, 300))
}

// 3) Thai locale strings
const idx = js.indexOf('service:{')
if (idx >= 0) console.log('\nservice block EN:', js.slice(idx, idx + 120))

const thIdx = js.indexOf('a19:')
if (thIdx >= 0) console.log('common a19 (tab):', js.slice(thIdx, thIdx + 60))
