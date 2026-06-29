import fs from 'fs'

const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')

// Find activity/bonus related routes
for (const m of s.matchAll(/\{path:"([^"]+)",name:"([^"]+)"/g)) {
  const path = m[1]
  const name = m[2]
  if (/activity|caijin|caiJin|bonus|msg|promo/i.test(path + name)) {
    console.log(path, '->', name)
  }
}

// i18n for my.d14, d20, d21
const idx = s.indexOf('my:{')
if (idx >= 0) console.log('\n', s.substring(idx, idx + 800))

// ActivityView navigation
const av = fs.readFileSync('ref_assets/pages/ActivityView-7pHEXAjh.js', 'utf8')
for (const m of av.matchAll(/push\(\{path:"([^"]+)"/g)) console.log('Activity push:', m[1])
for (const m of av.matchAll(/push\("([^"]+)"/g)) console.log('Activity push:', m[1])

// MyView links to activity
const mv = fs.readFileSync('ref_assets/pages/MyView-d7INSekA.js', 'utf8')
for (const pat of ['/activity', '/caijin', '/caiJin', '/msg']) {
  const i = mv.indexOf(pat)
  if (i >= 0) console.log('\nMyView', pat, mv.substring(i - 80, i + 100))
}
