import fs from 'fs'

const c = fs.readFileSync('ref_assets/pages/PopupView-Cevjsv2b.js', 'utf8')
for (const pat of ['activity', 'msg', 'caijin', 'caiJin', 'd14', 'd13', 'd20']) {
  let idx = 0
  while ((idx = c.indexOf(pat, idx)) >= 0) {
    console.log(pat, c.substring(idx - 60, idx + 100))
    idx += pat.length
    break
  }
}
