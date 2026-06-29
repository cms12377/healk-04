import fs from 'fs'

const myJs = fs.readFileSync('ref_assets/pages/MyView-d7INSekA.js', 'utf8')
const matches = [...myJs.matchAll(/"(data:image\/png;base64,[^"]+)"/g)]
const names = ['profit', 'cards']
matches.forEach((m, i) => {
  if (i >= names.length) return
  const b64 = m[1].replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync(`public/assets/my/${names[i]}.png`, Buffer.from(b64, 'base64'))
})

const tuicu = fs.readFileSync('ref_assets/pages/tuicu-BLlN2Dhu.js', 'utf8')
const logoutMatch = tuicu.match(/u="(data:image\/png;base64,[^"]+)"/)
if (logoutMatch) {
  const b64 = logoutMatch[1].replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('public/assets/my/logout.png', Buffer.from(b64, 'base64'))
}

console.log('done')
