/** K3 combo helpers (th6688 SanBuTong / ErTongDan) */

export function k3Combinations(values: number[], k: number): number[][] {
  if (k <= 0 || values.length < k) return []
  const out: number[][] = []
  const walk = (start: number, path: number[]) => {
    if (path.length === k) {
      out.push([...path])
      return
    }
    for (let i = start; i < values.length; i++) {
      path.push(values[i])
      walk(i + 1, path)
      path.pop()
    }
  }
  walk(0, [])
  return out
}

export function k3MultisetPermutations(values: number[]): string[] {
  const sorted = [...values].sort((a, b) => a - b)
  const seen = new Set<string>()
  const out: string[] = []
  const permute = (arr: number[], l: number) => {
    if (l === arr.length) {
      const key = arr.join('')
      if (!seen.has(key)) {
        seen.add(key)
        out.push(key)
      }
      return
    }
    for (let i = l; i < arr.length; i++) {
      ;[arr[l], arr[i]] = [arr[i], arr[l]]
      permute(arr, l + 1)
      ;[arr[l], arr[i]] = [arr[i], arr[l]]
    }
  }
  permute([...sorted], 0)
  return out
}

/** Pair digit + single digit → 112, 121, 211 (th6688 ErTongDan) */
export function k3PairSingleCombos(pairDigit: number, singleDigit: number): string[] {
  if (pairDigit === singleDigit) return []
  return k3MultisetPermutations([pairDigit, pairDigit, singleDigit])
}

export function parseErTongDanTemplate(raw: string): { pair: number; single: number }[] {
  return raw.split(',').flatMap((chunk) => {
    const [pair, single] = chunk.split('|')
    if (!pair || !single) return []
    const p = Number(pair[0])
    const s = Number(single)
    if (p < 1 || p > 6 || s < 1 || s > 6) return []
    return [{ pair: p, single: s }]
  })
}

export function isK3PickGroup(code: string): boolean {
  return code === 'sbdh' || code === 'ebdh' || code === 'etdx'
}

export function isK3TemplateBetContent(betContent: string): boolean {
  return betContent.includes(',') || betContent.includes('|')
}
