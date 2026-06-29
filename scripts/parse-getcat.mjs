import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
let pos = 0
let n = 0
while (n < 15) {
  const i = js.indexOf('goTo', pos)
  if (i === -1) break
  const ctx = js.slice(Math.max(0, i - 60), i + 200)
  if (ctx.includes('push') || ctx.includes('path')) {
    console.log('---', i)
    console.log(ctx)
    n++
  }
  pos = i + 1
}
