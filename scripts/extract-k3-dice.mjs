/**
 * Extract K3 dice PNGs from th6688 KuaiSan scoped CSS (base64 backgrounds).
 * Run once: node scripts/extract-k3-dice.mjs
 */
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/assets/k3')
mkdirSync(outDir, { recursive: true })

const cssUrl = 'https://th6688.vip/assets/KuaiSan-Ck1mmddQ.css'
const css = await fetch(cssUrl).then((r) => r.text())

for (let n = 1; n <= 6; n++) {
  const re = new RegExp(`\\.bgi${n}\\[data-v-29af6776\\]\\{background-image:url\\((data:image/png;base64,[^)]+)\\)`)
  const m = css.match(re)
  if (!m) {
    console.error(`Missing bgi${n} in CSS`)
    process.exit(1)
  }
  const b64 = m[1].replace(/^data:image\/png;base64,/, '')
  writeFileSync(resolve(outDir, `dice-${n}.png`), Buffer.from(b64, 'base64'))
  console.log(`Wrote dice-${n}.png`)
}

console.log('Done:', outDir)
