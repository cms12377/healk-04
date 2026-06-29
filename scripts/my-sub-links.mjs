import fs from 'fs'
import path from 'path'

const subDir = 'ref_assets/pages/sub'
const files = fs.readdirSync(subDir).filter((f) => f.endsWith('.js'))

for (const f of files) {
  const c = fs.readFileSync(path.join(subDir, f), 'utf8')
  const paths = new Set()
  for (const m of c.matchAll(/push\(\{path:"([^"]+)"/g)) paths.add(m[1])
  for (const m of c.matchAll(/push\("([^"]+)"/g)) paths.add(m[1])
  if (paths.size) {
    console.log(`\n${f}:`)
    for (const p of paths) console.log(' ', p)
  }
}
