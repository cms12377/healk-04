const js = await fetch('https://th6688.vip/assets/XingYun-nZSMZEVo.js').then((r) => r.text())
console.log('size', js.length)
const names = [...js.matchAll(/__name:"([^"]+)"/g)].map((m) => m[1])
console.log('components', [...new Set(names)])
for (const p of ['grid-cols-2', 'grid-cols-4', 'grid-cols-5', 'grid-cols-1', 'bet-row', 'BET_NUM']) {
  let i = 0, c = 0
  while ((i = js.indexOf(p, i)) >= 0 && c < 2) {
    console.log('\n', p, c, js.slice(Math.max(0, i - 60), i + 100))
    i++; c++
  }
}
