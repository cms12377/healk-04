const js = await (await fetch('https://th6688.vip/assets/index-CxE4V138.js')).text()
const terms = [
  'win_rate', 'winRate', 'random_win', '胜率', '杀率', '杀号', '控奖', '控单',
  'member_win', 'user_win', 'day_win', 'profit_rate', 'draw_mode', 'next_result',
  'casino', 'biased', 'randomWinRate', 'winning_rate', 'control_user', 'control_member',
  'preset_result', 'kill_rate',
]
console.log('=== th6688 index bundle term scan ===')
let found = 0
for (const t of terms) {
  let idx = js.indexOf(t)
  while (idx >= 0) {
    found++
    console.log(`[${t}]`, js.slice(Math.max(0, idx - 40), idx + t.length + 40).replace(/\s+/g, ' '))
    idx = js.indexOf(t, idx + 1)
  }
}
if (!found) console.log('(no win-rate / control terms found)')

const apis = [...new Set([...js.matchAll(/\/api\/[a-zA-Z0-9_/]+/g)].map((m) => m[0]))].sort()
console.log('\n=== th6688 member+agent APIs ===')
for (const a of apis) console.log(a)
