const js = await fetch('https://th6688.vip/assets/index-CxE4V138.js').then((r) => r.text())
const m = js.match(/th:\{[\s\S]*?common:\{([\s\S]*?)\},pkShi:/)
if (m) {
  for (const n of [85, 86, 87, 88, 89, 90, 91, 92, 93]) {
    const re = new RegExp(`a${n}:"([^"]+)"`)
    const hit = m[1].match(re)
    if (hit) console.log(`a${n}: ${hit[1]}`)
  }
}
