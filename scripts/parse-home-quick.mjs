import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const start = js.indexOf('__name:"HomeView"')
const chunk = js.slice(start, start + 8000)

// quick tiles section
const quickIdx = chunk.indexOf('common.a68')
console.log('Quick section:')
console.log(chunk.slice(quickIdx - 200, quickIdx + 1200))

console.log('\n\nGrid section:')
const gridIdx = chunk.indexOf('w-[80px] h-[80px]')
console.log(chunk.slice(gridIdx - 100, gridIdx + 400))
