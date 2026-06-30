const BASE = 'https://th6688.vip'
const r = await fetch(BASE + '/api/game/games')
console.log('status', r.status)
console.log('content-type', r.headers.get('content-type'))
const t = await r.text()
console.log(t.slice(0, 500))
