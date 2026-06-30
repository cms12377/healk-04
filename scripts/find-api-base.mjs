const js = await fetch('https://th6688.vip/assets/index-CxE4V138.js').then((r) => r.text())
const bases = [...js.matchAll(/baseURL[^;]{0,120}/g)].map((m) => m[0])
console.log('baseURL:', bases.slice(0, 5))
const urls = [...js.matchAll(/https?:\/\/[a-zA-Z0-9._/-]+/g)].map((m) => m[0])
const apiHosts = [...new Set(urls.filter((u) => /api|admin|laoadmin|6688/.test(u)))]
console.log('hosts:', apiHosts.slice(0, 20))
