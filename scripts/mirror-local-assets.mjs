/**
 * One-time: copy UI assets into public/assets so the app never loads th6688/laoadmin at runtime.
 * Run: node scripts/mirror-local-assets.mjs
 */
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicAssets = path.join(root, 'public/assets')

/** [remoteUrl, localPath under public/] */
const TH6688 = 'https://th6688.vip'
const MIRROR = [
  [`${TH6688}/assets/logo-zO4BDkdg.jpg`, 'assets/logo.jpg'],
  [`${TH6688}/assets/login_bg-mLn_IdxS.png`, 'assets/login_bg.png'],
  [`${TH6688}/assets/hotLottery-x5UubMuW.png`, 'assets/hotLottery.png'],
  [`${TH6688}/assets/all-cgpxcFyc.png`, 'assets/all.png'],
  [`${TH6688}/assets/lobby-CZimZjU1.png`, 'assets/lobby.png'],
  [`${TH6688}/assets/h1-BuIjQHpg.png`, 'assets/h1.png'],
  [`${TH6688}/assets/h2-CikLDLVd.png`, 'assets/h2.png'],
  [`${TH6688}/assets/h3-CCvcdKp0.png`, 'assets/h3.png'],
  [`${TH6688}/assets/h4-y3MIiySm.png`, 'assets/h4.png'],
  [`${TH6688}/assets/banners/5e7d4bbe39c155668986f351cc5dcd8a.jpg`, 'assets/banners/home.jpg'],
  [`${TH6688}/assets/games/game-select_red-C32t_Ktw.png`, 'assets/games/game-select_red.png'],
  [`${TH6688}/assets/my/blue-BVzXFUw-.png`, 'assets/my/blue.png'],
  [`${TH6688}/assets/qb-CySjdKPQ.png`, 'assets/qb.png'],
  [`${TH6688}/assets/jy-q43hYNKD.png`, 'assets/jy.png'],
  [`${TH6688}/assets/lang-CWQVhy2J.png`, 'assets/lang.png'],
  [`${TH6688}/assets/kefu2-D3qIuZKV.png`, 'assets/kefu2.png'],
  [`${TH6688}/assets/vipBanner-th-1IJ-GAzu.png`, 'assets/vip/vipBanner-th.png'],
  [`${TH6688}/assets/1-BxIsJV4J.png`, 'assets/vip/1.png'],
  [`${TH6688}/assets/2-B1RfYXkD.png`, 'assets/vip/2.png'],
  [`${TH6688}/assets/3-DZoi8Bny.png`, 'assets/vip/3.png'],
  [`${TH6688}/assets/4-DpO3PDbv.png`, 'assets/vip/4.png'],
  [`${TH6688}/assets/5-vIQS-PPL.png`, 'assets/vip/5.png'],
  [`${TH6688}/assets/6-CTLuJNiL.png`, 'assets/vip/6.png'],
  [`${TH6688}/assets/1000q-CAm4NvHi.png`, 'assets/chips/1000.png'],
  [`${TH6688}/assets/5000q-CXVCK1Yf.png`, 'assets/chips/5000.png'],
  [`${TH6688}/assets/1wq-BIXSIfB4.png`, 'assets/chips/10000.png'],
  [`${TH6688}/assets/5wq-CWXQR1-q.png`, 'assets/chips/50000.png'],
]

const LAOADMIN = 'https://laoadmin.top/uploads/20250901'
const GAME_ICONS = {
  df_pk10: `${LAOADMIN}/9e1e2c9e273276a63cf39435a1d0aa21.png`,
  df_pk10_3: `${LAOADMIN}/4d04d493eddd875cb33d4acf4e8f074d.png`,
  df_pk10_5: `${LAOADMIN}/22492eaaaddd9de0bc3e0e97fc31b646.png`,
  df_k3: `${LAOADMIN}/17a26763db42b3e59e4b88431660d092.png`,
  xam_6: `${LAOADMIN}/ca0493ff76bc02dcd9de10f41afb14a4.png`,
  xy_28: `${LAOADMIN}/1bd597045cbbabc028820c54557b11f5.png`,
  df_ssc: `${LAOADMIN}/bd6b5dd37143196e6090c529c47c927d.png`,
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} → HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function mirrorOne(url, relPath) {
  const target = path.join(root, 'public', relPath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log('skip (exists)', relPath)
    return
  }
  const buf = await fetchUrl(url)
  fs.writeFileSync(target, buf)
  console.log('wrote', relPath, buf.length)
}

async function main() {
  for (const [url, rel] of MIRROR) {
    try {
      await mirrorOne(url, rel)
    } catch (e) {
      console.error('FAIL', rel, e.message)
    }
  }
  for (const [code, url] of Object.entries(GAME_ICONS)) {
    try {
      await mirrorOne(url, `assets/games/${code}.png`)
    } catch (e) {
      console.error('FAIL game', code, e.message)
    }
  }
  console.log('done')
}

main()
