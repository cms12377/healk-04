import fs from 'fs'

const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const idx = s.indexOf('common.a52')
console.log(s.substring(idx - 800, idx + 1200))
