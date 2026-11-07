/** K3 combo helpers (SanBuTong / ErTongDan) */

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

/** Pair digit + single digit → canonical code e.g. 112 (one line submit; multiset settlement) */
export function k3PairSingleCombos(pairDigit: number, singleDigit: number): string[] {
  if (pairDigit === singleDigit) return []
  return [`${pairDigit}${pairDigit}${singleDigit}`]
}

export interface ErTongDanColumn {
  /** Pair bet code e.g. "11" */
  code: string
  /** Single digit key e.g. "1" */
  group: string
  pair: number
  single: number
}

/**. ErTongDan — parse `11|1,22|2,...` into column list */
export function parseErTongDanColumns(raw: string): ErTongDanColumn[] {
  return raw.split(',').flatMap((chunk) => {
    const [pairPart, singlePart] = chunk.split('|')
    if (!pairPart || singlePart == null) return []
    const code = pairPart.trim()
    const group = String(singlePart).trim()
    const pair = Number(code[0])
    const single = Number(group)
    if (pair < 1 || pair > 6 || single < 1 || single > 6) return []
    if (code.length !== 2 || Number(code[1]) !== pair) return []
    return [{ code, group, pair, single }]
  })
}

export function isK3PickGroup(code: string): boolean {
  return code === 'sbdh' || code === 'ebdh' || code === 'etdx'
}

export function isK3TemplateBetContent(betContent: string): boolean {
  return betContent.includes(',') || betContent.includes('|')
}
