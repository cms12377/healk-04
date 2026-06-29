import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')

// Find API functions W_ and K_ used in HomeView
for (const fn of ['W_', 'K_', 'function W_', 'function K_', '/api/', 'baseURL', 'lottery/list', 'home/index']) {
  let idx = 0
  let n = 0
  while ((idx = js.indexOf(fn, idx)) >= 0 && n < 5) {
    console.log(`\n=== ${fn} @ ${idx} ===`)
    console.log(js.slice(Math.max(0, idx - 50), idx + 300))
    idx += fn.length
    n++
  }
}

// Extract axios base URL
const baseMatch = js.match(/baseURL:"([^"]+)"/)
console.log('\nbaseURL:', baseMatch?.[1])
