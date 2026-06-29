import fs from 'fs'

const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
let idx = 0
while ((idx = s.indexOf('/activity', idx)) >= 0) {
  console.log(s.substring(idx - 80, idx + 80))
  idx += 1
}

console.log('\n--- msg ---')
idx = 0
while ((idx = s.indexOf('/msg"', idx)) >= 0) {
  console.log(s.substring(idx - 80, idx + 80))
  idx += 1
}
