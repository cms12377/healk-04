/**
 * Keep all game rounds advancing (like laoadmin cron) — run alongside yarn dev or on a VPS.
 *
 *   node scripts/cron-advance-games.mjs
 *   yarn cron:games
 */
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INTERVAL_MS = 60_000

function runOnce() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['scripts/advance-due-games.mjs'], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    })
    child.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`advance-due-games exited ${code}`))
    })
  })
}

console.log(`[cron:games] every ${INTERVAL_MS / 1000}s — Ctrl+C to stop`)

async function loop() {
  for (;;) {
    const started = new Date().toISOString()
    try {
      await runOnce()
    } catch (e) {
      console.error(`[cron:games] ${started} error:`, e instanceof Error ? e.message : e)
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
}

void loop()
