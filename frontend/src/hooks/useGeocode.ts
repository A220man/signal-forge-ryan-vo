import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../services/api'
import type { GeocodeResult } from '../types'

export function useGeocode() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const response = await api.geocode(searchQuery)
      if (!abortRef.current.signal.aborted) {
        setResults(response.results)
      }
    } catch (e) {
      if (!abortRef.current.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Search failed')
        setResults([])
      }
    } finally {
      if (!abortRef.current.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      search(newQuery)
    }, 300)
  }, [search])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return {
    query,
    setQuery: handleQueryChange,
    results,
    loading,
    error,
    clear,
    search,
  }
}