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

/** Parse bet label/code like "111", "11", "123" into dice face values */
export function parseK3DiceDigits(label: string, betContent?: string): number[] | null {
  const source = (betContent && !betContent.includes(',') && !betContent.includes('|')
    ? betContent
    : label
  ).replace(/\s/g, '')

  if (/^(\d)\1\1$/.test(source)) {
    const d = Number(source[0])
    return [d, d, d]
  }
  if (/^(\d)\1$/.test(source)) {
    const d = Number(source[0])
    return [d, d]
  }
  if (/^[1-6]{3,5}$/.test(source) && !/^(\d)\1\1?$/.test(source)) {
    return source.split('').map(Number)
  }
  const legacy = betContent?.match(/^triple_(\d)$/)
  if (legacy) {
    const d = Number(legacy[1])
    return [d, d, d]
  }
  if (/^[1-6]{3,5}$/.test(label.replace(/\s/g, ''))) {
    return label.replace(/\s/g, '').split('').map(Number)
  }
  return null
}
