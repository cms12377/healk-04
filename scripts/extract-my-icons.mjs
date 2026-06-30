import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(root, 'ref_assets/pages/MyView-d7INSekA.js'), 'utf8')
const outDir = path.join(root, 'public/assets/my')
fs.mkdirSync(outDir, { recursive: true })

const pairs = [
  ['F', 'profit.png'],
  ['J', 'cards.png'],
]

for (const [key, fileName] of pairs) {
  const re = new RegExp(`${key}="(data:image/png;base64,[^"]+)"`)
  const m = src.match(re)
  if (!m) {
    console.error('missing', key)
    continue
  }
  const b64 = m[1].replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync(path.join(outDir, fileName), Buffer.from(b64, 'base64'))
  console.log('wrote', fileName)
}
