export function localDateTimeToEpoch(date: string, time: string): number {
  return Math.floor(new Date(`${date}T${time}`).getTime() / 1000)
}

export function formatDrawScheduleTime(epoch: number): string {
  const d = new Date(epoch * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
