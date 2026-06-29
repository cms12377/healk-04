import fs from 'fs'

const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const idx = s.indexOf('allGame:{')
if (idx >= 0) {
  console.log(s.substring(idx, idx + 1500))
}

// search push to rule
for (const file of fs.readdirSync('ref_assets/pages/home').filter((f) => f.endsWith('.js'))) {
  const content = fs.readFileSync(`ref_assets/pages/home/${file}`, 'utf8')
  if (content.includes('/rule')) {
    console.log('\nFound /rule in', file)
    const i = content.indexOf('/rule')
    console.log(content.substring(i - 100, i + 150))
  }
}

// PkShiDs might have rule link
const pkds = fs.readdirSync('ref_assets/pages/home').find((f) => f.includes('PkShiDs'))
if (pkds) {
  const c = fs.readFileSync(`ref_assets/pages/home/${pkds}`, 'utf8')
  if (c.includes('rule')) console.log('\nPkShiDs rule:', c.match(/.{0,80}rule.{0,80}/g))
}
