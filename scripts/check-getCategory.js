import fs from 'fs'

const js = fs.readFileSync('ref_assets/index-CxE4V138.js', 'utf8')
const homeStart = js.indexOf('HomeView",setup')
const homeEnd = js.indexOf('HomeView",setup') + 15000
const chunk = js.slice(homeStart, homeEnd)

const getCat = chunk.match(/getCategory[^}]+}/)
console.log('getCategory fn:', getCat?.[0]?.slice(0, 500))

const goTo = chunk.match(/goTo[^}]+}/)
console.log('goTo fn:', goTo?.[0]?.slice(0, 300))
