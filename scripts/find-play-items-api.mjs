const js = await fetch('https://th6688.vip/assets/index-CxE4V138.js').then((r) => r.text())

const idx = js.indexOf('/api/game/play_items')
console.log('play_items context:')
console.log(js.slice(idx - 300, idx + 800))

// Find Bt export - search play_items function
const matches = [...js.matchAll(/play_items[^;]{0,200}/g)]
for (const m of matches.slice(0, 5)) console.log('\n---', m[0])
