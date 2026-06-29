import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const idx = js.indexOf('getCategory')
console.log('getCategory occurrences:', (js.match(/getCategory/g) || []).length)
console.log(js.slice(idx - 200, idx + 1500))

const routes = [
  'kuaisan', 'aoLiu', 'xingyun', 'shiShiCai', 'pkShi', 'lotteryLobby', 'history', 'getCategory'
]
for (const r of routes) {
  const i = js.indexOf(`"/${r}"`)
  console.log(r, i >= 0 ? 'found' : 'missing')
}

const deps = [...new Set((js.match(/assets\/[A-Za-z0-9_-]+\.js/g) || []))]
const gameDeps = deps.filter((d) =>
  /kuaisan|aoLiu|xingyun|shiShi|PkShi|LotteryLobby|history|LiangMian|PopupView/i.test(d),
)
console.log('\nGame deps:\n', gameDeps.join('\n'))
