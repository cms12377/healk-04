import { readFileSync } from 'fs'

const s = readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const thIdx = s.indexOf('a26:"สองด้าน"')
console.log('Thai common labels:', s.slice(thIdx - 100, thIdx + 500))

const pkIdx = s.indexOf('pkShi:{', thIdx - 50000)
if (pkIdx > 0) {
  let depth = 0
  let end = pkIdx + 6
  for (; end < s.length; end++) {
    if (s[end] === '{') depth++
    if (s[end] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  console.log('\npkShi th:', s.slice(pkIdx, end + 1))
}
