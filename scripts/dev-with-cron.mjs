/**
 * Dev server + game cron together (matches th6688 laoadmin auto-draw).
 *
 *   yarn dev:all
 */
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'

function run(label, args) {
  const child = spawn(yarnCmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev:all] ${label} exited ${code}`)
      process.exit(code ?? 1)
    }
  })
  return child
}

console.log('[dev:all] vite + cron:games (th6688 auto-draw) — Ctrl+C to stop both')

const cron = run('cron:games', ['cron:games'])
const dev = run('dev', ['dev'])

function shutdown() {
  cron.kill('SIGTERM')
  dev.kill('SIGTERM')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
