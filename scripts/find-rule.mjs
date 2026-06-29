import fs from 'fs'

const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const ruleChunks = [...s.matchAll(/Rule[A-Za-z0-9_-]*\.js/g)].map((m) => m[0])
console.log('Rule chunks:', [...new Set(ruleChunks)])

const idx = s.indexOf('path:"/rule"')
console.log('rule route idx:', idx)
if (idx > 0) console.log(s.substring(idx - 300, idx + 500))

const pk = fs.readFileSync('ref_assets/pages/home/PkShi-BeVOcwje.js', 'utf8')
for (const pat of ['/rule', 'rule', '玩法', '规则', 'rule.']) {
  const i = pk.indexOf(pat)
  if (i >= 0) console.log(`PkShi "${pat}" at ${i}:`, pk.substring(Math.max(0, i - 80), i + 120))
}
