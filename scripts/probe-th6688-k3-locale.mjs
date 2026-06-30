import { writeFileSync } from 'fs'

const js = await fetch('https://th6688.vip/assets/index-CxE4V138.js').then((r) => r.text())

// Extract th locale block
const thMatch = js.match(/th:\{[^}]+common:\{([^}]+)\}/)
if (thMatch) {
  for (const n of [80, 85, 86, 87, 88, 89, 90, 91, 92, 93]) {
    const re = new RegExp(`a${n}:"([^"]+)"`)
    const m = thMatch[1].match(re)
    if (m) console.log(`common.a${n}: ${m[1]}`)
  }
}

// Try play_items with POST body like the app
const BASE = 'https://th6688.vip'
for (const body of [
  { category_id: 2 },
  { games_id: 2 },
  { id: 2 },
]) {
  try {
    const r = await fetch(`${BASE}/api/game/play_items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await r.text()
    if (text.startsWith('{')) {
      const j = JSON.parse(text)
      if (j.code === 1) {
        console.log('\nPOST play_items', body, 'OK')
        writeFileSync('scripts/th6688-k3-play_items.json', JSON.stringify(j, null, 2))
        break
      }
    }
  } catch (e) {
    console.log('POST fail', e.message)
  }
}

// GET with group ids from KuaiSan (common group ids 6,10,12,13 mentioned in JS)
for (const gid of ['6', '7', '8', '9', '10', '11', '12', '13', '14', '6,10,12,13']) {
  const r = await fetch(`${BASE}/api/game/play_items?group_id=${gid}`)
  const t = await r.text()
  if (t.startsWith('{')) {
    const j = JSON.parse(t)
    if (j.code === 1 && j.data) {
      console.log(`\nGET group_id=${gid} entries:`, Object.keys(j.data).length)
    }
  }
}
