"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { itineraryAPI } from "../../services/api"
import { useDebouncedValue } from "../../hooks/useDebouncedValue"
import { useAskAi } from "../../context/AskAiContext"
import { useAuth } from "../../context/AuthContext"

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: { from: { pathname, search }, message: GUARD_MESSAGE },
})

/**
 * Unified search — compact in the navbar, full-width on dedicated pages.
 */
export default function NavbarSearch({ compact = false, className = "" }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { openAskAi } = useAskAi()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loadingSug, setLoadingSug] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const debouncedQuery = useDebouncedValue(query, 300)

  useEffect(() => {
    if (!isAuthenticated) {
      setSuggestions([])
      setLoadingSug(false)
      return
    }
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
  }, [debouncedQuery, isAuthenticated])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        if (compact) setExpanded(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [compact])

  const runSearch = useCallback(
    (raw) => {
      const term = (raw ?? query).trim()
      setOpen(false)
      if (compact) setExpanded(false)
      if (!term) return
      const search = `?search=${encodeURIComponent(term)}`
      if (!isAuthenticated) {
        navigate(guardLogin("/itineraries", search))
        return
      }
      navigate(`/itineraries${search}`)
    },
    [compact, isAuthenticated, navigate, query],
  )

  const onSubmit = (e) => {
    e.preventDefault()
    runSearch()
  }

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false)
      if (compact) setExpanded(false)
      inputRef.current?.blur()
    }
    if (e.key === "Enter") {
      e.preventDefault()
      runSearch()
    }
  }

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${className}`}
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div ref={wrapRef} className={`relative ${compact ? "flex-1 min-w-0 max-w-md" : "max-w-2xl mx-auto w-full"} ${className}`}>
      <form
        onSubmit={onSubmit}
        className={`form-search-shell ${compact ? "!rounded-xl !py-0.5" : ""}`}
        role="search"
      >
        <div className="flex flex-1 items-center pl-3 min-w-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            placeholder="Search trips, places, hotels…"
            className="form-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            aria-label="Search itineraries"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="navbar-search-suggestions"
          />
        </div>
        <button
          type="button"
          onClick={() => openAskAi(query)}
          className="form-search-ask-ai !px-3 !py-1.5 !text-xs hidden sm:inline-flex"
        >
          Ask AI
        </button>
        <button type="submit" className="form-search-submit !px-4 !py-1.5 !text-xs">
          Search
        </button>
      </form>

      {open && query.trim().length >= 2 && (suggestions.length > 0 || loadingSug) ? (
        <ul
          id="navbar-search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-card py-1 text-sm shadow-lg"
        >
          {loadingSug && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">Searching…</li>
          ) : (
            suggestions.map((text) => (
              <li key={text} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-foreground hover:bg-muted transition-colors"
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
      ) : null}
    </div>
  )
}
