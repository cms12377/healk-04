import fs from 'fs'

const s = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const myRoutes = [
  'purses', 'rechargeNotes', 'recharge', 'transferBank', 'virtual', 'withdraw',
  'cards', 'gameBet', 'profits', 'profit', 'setPwd', 'editPwd', 'editPwdto',
  'lang', 'bindBank', 'virtualAdd', 'deposit', 'identityCard', 'bindAddress',
  'msg', 'activity', 'service',
]

for (const r of myRoutes) {
  const pat = `path:"/${r}"`
  if (s.includes(pat)) console.log('✓', pat)
  else console.log('✗', pat)
}

// Parse MyView template for menu labels - search for $t("my.
const mv = fs.readFileSync('ref_assets/pages/MyView-d7INSekA.js', 'utf8')
for (const m of mv.matchAll(/\$t\("([^"]+)"/g)) {
  console.log('i18n key:', m[1])
}
