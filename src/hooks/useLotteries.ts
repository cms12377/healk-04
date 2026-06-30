import { useCallback, useEffect, useState } from 'react'
import { fetchLotteries } from '@/services/api'
import type { LotteryItem } from '@/types'

export function useLotteries() {
  const [lotteries, setLotteries] = useState<LotteryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchLotteries()
      .then((items) => {
        if (!cancelled) setLotteries(items)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    const items = await fetchLotteries(true)
    setLotteries(items)
    return items
  }, [])

  return { lotteries, loading, error, refresh }
}
