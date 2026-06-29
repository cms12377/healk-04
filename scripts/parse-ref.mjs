import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const idx = js.indexOf('__name:"Home')
console.log('Home at', idx)
if (idx >= 0) console.log(js.slice(idx, idx + 4000))

const idx2 = js.indexOf('getCategory=')
console.log('\ngetCategory= at', idx2)
if (idx2 >= 0) console.log(js.slice(idx2, idx2 + 800))

for (const pat of ['getCategory:', 'getCategory(', 'function getCategory', 'const getCategory']) {
  let i = 0
  let c = 0
  while ((idx = js.indexOf(pat, i)) !== -1 && c < 5) {
    if (pat === 'getCategory(' && js.slice(idx - 20, idx).includes('onClick')) {
      i = idx + 1
      continue
    }
    console.log('\n---', pat, 'at', idx)
    console.log(js.slice(Math.max(0, idx - 150), idx + 400))
    i = idx + 1
    c++
  }
}
