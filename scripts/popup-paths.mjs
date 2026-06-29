import fs from 'fs'

const c = fs.readFileSync('ref_assets/pages/PopupView-Cevjsv2b.js', 'utf8')
for (const m of c.matchAll(/d\("([^"]+)"/g)) console.log(m[1])
for (const m of c.matchAll(/push\(\{path:"([^"]+)"/g)) console.log('push:', m[1])
