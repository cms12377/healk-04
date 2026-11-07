import { useCallback, useEffect, useState } from 'react'
import { fetchSiteNotice } from '@/services/api'

export function useSiteNotice() {
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchSiteNotice()
      .then((text) => {
        if (!cancelled) setNotice(text)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    const text = await fetchSiteNotice(true)
    setNotice(text)
    return text
  }, [])

  return { notice, loading, refresh }
}
