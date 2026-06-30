import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/tabs')

const FILE_NAMES = {
  q_: 'q_.png',
  Y_: 'Y_.png',
  Fu: 'Fu.png',
  $_: 'bonus-active.png',
  X_: 'X_.png',
  Vu: 'Vu.png',
  J_: 'J_.png',
  Q_: 'Q_.png',
}

https.get('https://th6688.vip/assets/index-CxE4V138.js', (res) => {
  let d = ''
  res.on('data', (c) => {
    d += c
  })
  res.on('end', () => {
    const re = /([A-Za-z_$][\w$]*)="(data:image\/png;base64,[^"]+)"/g
    const map = new Map()
    let m
    while ((m = re.exec(d))) {
      map.set(m[1], m[2])
    }

    fs.mkdirSync(outDir, { recursive: true })
    for (const [name, dataUrl] of map) {
      const fileName = FILE_NAMES[name] ?? `${name}.png`
      const b64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      const target = path.join(outDir, fileName)
      fs.writeFileSync(target, Buffer.from(b64, 'base64'))
      console.log('wrote', fileName, fs.statSync(target).size)
    }
  })
})
