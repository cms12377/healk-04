const url = 'https://th6688.vip/assets/AoLiu-Dro8-4_W.js'
const js = await fetch(url).then((r) => r.text())
const idx = js.indexOf('__name:"YiXiao"')
console.log(js.slice(idx, idx + 3500))
