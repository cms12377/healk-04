import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')

// Find home view / lottery list image usage
for (const pat of ['HomeView', 'lottery-home', 'getLottery', 'getCategory', 'lotteries', '.image']) {
  let idx = 0
  let count = 0
  while ((idx = js.indexOf(pat, idx)) >= 0 && count < 3) {
    console.log(`\n=== ${pat} @ ${idx} ===`)
    console.log(js.slice(idx - 100, idx + 500))
    idx += pat.length
    count++
  }
}

// All game-related image paths
const gamePaths = [...js.matchAll(/\/assets\/[^"'`\s]*(?:pk10|k3|ssc|xam|xy|game)[^"'`\s]*/gi)].map((m) => m[0])
console.log('\n=== game paths in bundle ===')
console.log([...new Set(gamePaths)])
