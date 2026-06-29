import fs from 'fs'
import path from 'path'

const files = [
  'ActivityView-7pHEXAjh.js',
  'CaiJin-Db6BO5EG.js',
  'MsgView-DMlkcYwQ.js',
  'MsgDetail-D5ihUPhF.js',
  'PopupView-Cevjsv2b.js',
  'MyView-d7INSekA.js',
]

for (const f of files) {
  const p = path.join('ref_assets/pages', f)
  if (!fs.existsSync(p)) continue
  const c = fs.readFileSync(p, 'utf8')
  const paths = new Set()
  for (const m of c.matchAll(/push\(\{path:"([^"]+)"/g)) paths.add(m[1])
  for (const m of c.matchAll(/push\("([^"]+)"/g)) paths.add(m[1])
  if (paths.size) {
    console.log(`\n${f}:`)
    for (const pth of paths) console.log(' ', pth)
  }
}

// Thai i18n for caijin
const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const i = s.indexOf('caijin:{')
if (i >= 0) console.log('\ncaijin i18n:', s.substring(i, i + 400))
