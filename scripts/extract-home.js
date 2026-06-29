import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const idx = js.indexOf('HomeView')
console.log(js.slice(idx, idx + 8000))
