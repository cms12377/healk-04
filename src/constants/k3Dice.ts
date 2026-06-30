/** th6688 KuaiSan dice face images (from KuaiSan-Ck1mmddQ.css) */
export const K3_DICE_IMAGES: Record<number, string> = {
  1: '/assets/k3/dice-1.png',
  2: '/assets/k3/dice-2.png',
  3: '/assets/k3/dice-3.png',
  4: '/assets/k3/dice-4.png',
  5: '/assets/k3/dice-5.png',
  6: '/assets/k3/dice-6.png',
}

export function k3DiceImage(value: string | number): string | undefined {
  const n = Number(value)
  if (Number.isFinite(n) && n >= 1 && n <= 6) return K3_DICE_IMAGES[n]
  return undefined
}

/** Parse bet label/code like "111" or triple_3 into dice values [1,1,1] */
export function parseK3DiceDigits(label: string, betContent?: string): number[] | null {
  const raw = betContent?.match(/^triple_(\d)$/)
    ? rawTripleToDigits(betContent)
    : /^(\d{3,5})$/.test(label.replace(/\s/g, ''))
      ? label.replace(/\s/g, '').split('').map(Number)
      : null

  if (!raw) return null
  if (raw.some((d) => d < 1 || d > 6)) return null
  return raw
}

function rawTripleToDigits(betContent: string): number[] | null {
  const m = betContent.match(/^triple_(\d)$/)
  if (!m) return null
  const d = Number(m[1])
  return [d, d, d]
}
