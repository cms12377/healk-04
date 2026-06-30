const js = await fetch('https://th6688.vip/assets/KuaiSan-BoN8nyf6.js').then((r) => r.text())
for (const n of ['HeZhi', 'SanLianHao', 'SanTongHao', 'ErTongHao', 'LiangMian', 'Ee']) {
  const key = `__name:"${n}"`
  const i = js.indexOf(key)
  if (i >= 0) {
    console.log(`\n===== ${n} =====`)
    console.log(js.slice(i, i + 1800))
  }
}
