const BASE = 'https://laoadmin.top/api/game/current_game'

const games = [
  ['df_pk10', 1],
  ['df_pk10_3', 6],
  ['df_pk10_5', 7],
  ['df_k3', 2],
  ['xam_6', 3],
  ['xy_28', 4],
  ['df_ssc', 5],
]

const now = Math.floor(Date.now() / 1000)
console.log('now unix:', now, new Date().toISOString())
console.log('')

for (const [code, id] of games) {
  const res = await fetch(`${BASE}?games_id=${id}`, { method: 'POST' })
  const json = await res.json()
  const d = json?.data ?? {}
  const left = d.draw_time ? d.draw_time - now : null
  console.log(
    code.padEnd(10),
    'issue:', d.issue,
    'draw_time:', d.draw_time,
    'left_sec:', left,
    left != null ? `(${Math.floor(left / 60)}m ${left % 60}s)` : '',
  )
  // log extra timing fields if any
  const extra = Object.fromEntries(
    Object.entries(d).filter(([k]) =>
      /time|cycle|close|seal|interval|period|second/i.test(k),
    ),
  )
  if (Object.keys(extra).length) console.log('  fields:', extra)
}
