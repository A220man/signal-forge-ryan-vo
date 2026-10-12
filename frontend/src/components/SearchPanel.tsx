import { useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { SearchIcon, XIcon, MapPinIcon } from 'lucide-react'
import { useGeocode } from '../hooks'
import type { GeocodeResult } from '../types'
import styles from './SearchPanel.module.css'

interface SearchPanelProps {
  onSelectLocation: (result: GeocodeResult) => void
}

export function SearchPanel({ onSelectLocation }: SearchPanelProps) {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    clear,
  } = useGeocode()

  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        clear()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [clear])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      clear()
      inputRef.current?.blur()
    } else if (e.key === 'Enter' && results.length > 0) {
      onSelectLocation(results[0])
      clear()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const items = wrapperRef.current?.querySelectorAll('[data-result-item]')
      if (items?.length) {
        (items[0] as HTMLElement).focus()
      }
    }
  }, [results, clear, onSelectLocation])

  const handleResultKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, result: GeocodeResult) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectLocation(result)
      clear()
    } else if (e.key === 'Escape') {
      clear()
      inputRef.current?.focus()
    }
  }, [onSelectLocation, clear])

  return (
    <div ref={wrapperRef} className={styles.searchPanel}>
      <div className={styles.searchInputWrapper}>
        <SearchIcon className={styles.searchIcon} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search locations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {}}
          autoComplete="off"
          aria-label="Search for a location"
          aria-expanded={results.length > 0}
          aria-controls="search-results"
          aria-activedescendant={results.length > 0 ? 'result-0' : undefined}
        />
        {query && (
          <button
            className={styles.clearButton}
            onClick={clear}
            aria-label="Clear search"
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        )}
        {loading && <div className={styles.searchLoading} aria-hidden="true" />}
      </div>

      {(results.length > 0 || error) && (
        <div
          id="search-results"
          className={styles.searchResults}
          role="listbox"
          aria-label="Search results"
        >
          {error && (
            <div className={styles.searchEmpty} role="option">
              Error: {error}
            </div>
          )}
          {results.map((result, index) => (
            <div
              key={result.place_id}
              data-result-item
              id={`result-${index}`}
              className={styles.searchResultItem}
              role="option"
              tabIndex={-1}
              onClick={() => {
                onSelectLocation(result)
                clear()
              }}
              onKeyDown={(e) => handleResultKeyDown(e, result)}
            >
              <MapPinIcon className={styles.searchResultIcon} aria-hidden="true" />
              <div className={styles.searchResultInfo}>
                <div className={styles.searchResultName}>{result.display_name.split(',')[0]}</div>
                <div className={styles.searchResultAddress}>
                  {result.display_name.split(',').slice(1).join(', ').trim()}
                </div>
              </div>
            </div>
          ))}
          {results.length === 0 && !error && !loading && (
            <div className={styles.searchEmpty} role="option">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  )
}