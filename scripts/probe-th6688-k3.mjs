import { writeFileSync } from 'fs'

const BASE = 'https://laoadmin.top'

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Accept: 'application/json' } })
  const t = await r.text()
  try {
    return JSON.parse(t)
  } catch {
    return { _status: r.status, _raw: t.slice(0, 200) }
  }
}

const games = await get('/api/game/games')
console.log('games code:', games?.code)
const k3 = games?.data?.find((g) => g.code === 'df_k3')
console.log('df_k3 id:', k3?.id, 'groups:', k3?.group?.map((g) => `${g.id}:${g.name}`))

if (k3?.group?.length) {
  const ids = k3.group.map((g) => g.id).join(',')
  const pi = await get(`/api/game/play_items?group_id=${ids}`)
  if (pi?.code === 1) {
    writeFileSync('scripts/th6688-k3-play_items.json', JSON.stringify(pi, null, 2))
    for (const entry of Object.values(pi.data)) {
      const g = entry.group
      const cats = entry.categories ?? []
      console.log(`\n=== ${g?.name} (id=${g?.id}, sort=${g?.sort}) ===`)
      for (const c of cats) {
        console.log(`  cat: ${c.category?.name} items=${c.items?.length}`)
        for (const item of c.items ?? []) {
          console.log(`    code="${item.code}" odds=${item.odds}`)
        }
      }
    }
  } else {
    console.log('play_items:', pi)
  }
}
