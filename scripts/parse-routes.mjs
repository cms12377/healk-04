import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const routes = [...js.matchAll(/path:"(\/[^"]+)"/g)].map((m) => m[1])
const unique = [...new Set(routes)].sort()
console.log('Routes:', unique.join('\n'))

const catIdx = js.indexOf('getCategory')
// search backwards for function definition near category API
const apiIdx = js.indexOf('/api/game/category')
console.log('\napi/game/category context:')
console.log(js.slice(apiIdx - 500, apiIdx + 500))
