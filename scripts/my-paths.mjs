import fs from 'fs'

const mv = fs.readFileSync('ref_assets/pages/MyView-d7INSekA.js', 'utf8')
for (const m of mv.matchAll(/d\("([^"]+)"/g)) console.log(m[1])
for (const m of mv.matchAll(/push\(\{path:"([^"]+)"/g)) console.log('push', m[1])
