import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')

const bonusChunks = [...new Set(js.match(/assets\/[^"']*[Bb]onus[^"']*/g) || [])]
console.log('bonus chunks:', bonusChunks)

const act = [...new Set(js.match(/assets\/[^"']*[Aa]ctiv[^"']*/g) || [])]
console.log('activity:', act)

const routes = [...new Set(js.match(/path:"[^"]+"/g) || [])]
console.log('routes:', routes)

// home page chunk
const homeIdx = js.indexOf('lottery-home')
if (homeIdx >= 0) console.log('\nhome chunk:', js.slice(homeIdx - 200, homeIdx + 4000))
