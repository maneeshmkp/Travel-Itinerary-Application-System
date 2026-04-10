import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search } from "lucide-react"
import { itineraryAPI } from "../services/api"
import { useDebouncedValue } from "../hooks/useDebouncedValue"

function SearchBarActive() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loadingSug, setLoadingSug] = useState(false)
  const wrapRef = useRef(null)

  const debouncedQuery = useDebouncedValue(query, 300)

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      setLoadingSug(false)
      return
    }
    let cancelled = false
    setLoadingSug(true)
    itineraryAPI
      .getSuggestions(q)
      .then((res) => {
        if (!cancelled) setSuggestions(res.data?.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSug(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const runSearch = useCallback(
    (raw) => {
      const term = (raw ?? query).trim()
      setOpen(false)
      if (!term) return
      navigate(`/itineraries?search=${encodeURIComponent(term)}`)
    },
    [navigate, query],
  )

  const onSubmit = (e) => {
    e.preventDefault()
    runSearch()
  }

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      runSearch()
    }
  }

  return (
    <div ref={wrapRef} className="relative max-w-xl mx-auto px-4 py-2">
      <form onSubmit={onSubmit} className="form-search-shell">
        <div className="flex flex-1 items-center pl-3 min-w-0">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="search"
            autoComplete="off"
            placeholder="Search destinations, itineraries, activities..."
            className="form-search-input text-base sm:text-sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
        <button
          type="submit"
          className="px-5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          Search
        </button>
      </form>
      {open && query.trim().length >= 2 && (suggestions.length > 0 || loadingSug) && (
        <ul className="absolute left-4 right-4 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
          {loadingSug && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">Searching…</li>
          ) : (
            suggestions.map((text) => (
              <li key={text}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setQuery(text)
                    runSearch(text)
                  }}
                >
                  {text}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function SearchBar() {
  const location = useLocation()
  if (location.pathname === "/" || location.pathname === "/itineraries") {
    return null
  }
  return <SearchBarActive />
}
