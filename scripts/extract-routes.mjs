import fs from 'fs'
import path from 'path'

const dirs = ['ref_assets/pages/home', 'ref_assets/pages']
const files = dirs.flatMap((dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, f))
    : [],
)

for (const filePath of files) {
  const s = fs.readFileSync(filePath, 'utf8')
  const paths = new Set()
  for (const m of s.matchAll(/push\(\{path:"([^"]+)"/g)) paths.add(m[1])
  for (const m of s.matchAll(/push\("([^"]+)"/g)) paths.add(m[1])
  if (paths.size) {
    console.log(`\n${path.basename(filePath)}:`)
    for (const p of paths) console.log(`  ${p}`)
  }
}
