import fs from 'fs'
import path from 'path'

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.js')) {
      const c = fs.readFileSync(p, 'utf8')
      if (c.includes('/rule')) {
        const i = c.indexOf('/rule')
        console.log('\n', p)
        console.log(c.substring(Math.max(0, i - 120), i + 120))
      }
    }
  }
}
walk('ref_assets')
