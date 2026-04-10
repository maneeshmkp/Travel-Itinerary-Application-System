"use client"

import { useState, useEffect, useLayoutEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Filter, MapPin, Calendar, Tag } from "lucide-react"
import { itineraryAPI } from "../services/api"
import ItineraryCard from "../components/ItineraryCard"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import EmptyState from "../components/EmptyState"
import { useDebouncedValue } from "../hooks/useDebouncedValue"

const Itineraries = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = searchParams.get("search") ?? ""

  const [inputValue, setInputValue] = useState(urlSearch)
  const debouncedSearch = useDebouncedValue(inputValue, 500)

  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    destination: "",
    nights: "",
    tags: "",
  })
  const [fetchPage, setFetchPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  })

  const tagOptions = ["beach", "adventure", "cultural", "luxury", "budget", "family", "romantic", "solo"]

  useEffect(() => {
    setInputValue(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    const next = debouncedSearch.trim()
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        const cur = (p.get("search") ?? "").trim()
        if (cur === next) return p
        if (next) p.set("search", next)
        else p.delete("search")
        return p
      },
      { replace: true },
    )
  }, [debouncedSearch, setSearchParams])

  useLayoutEffect(() => {
    setFetchPage(1)
  }, [debouncedSearch, filters.destination, filters.nights, filters.tags])

  const loadItineraries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: fetchPage,
        limit: pagination.limit,
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        ...(filters.destination && { destination: filters.destination }),
        ...(filters.nights && { nights: filters.nights }),
        ...(filters.tags && { tags: filters.tags }),
      }

      const response = await itineraryAPI.getAll(params)
      setItineraries(response.data.data ?? [])
      setPagination(response.data.pagination)
    } catch (err) {
      console.error("Error fetching itineraries:", err)
      setError("Failed to load itineraries. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [
    fetchPage,
    debouncedSearch,
    filters.destination,
    filters.nights,
    filters.tags,
    pagination.limit,
  ])

  useEffect(() => {
    loadItineraries()
  }, [loadItineraries])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setInputValue((v) => v.trim())
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const clearFilters = () => {
    setInputValue("")
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.delete("search")
      return p
    }, { replace: true })
    setFilters({
      destination: "",
      nights: "",
      tags: "",
    })
  }

  const handlePageChange = (newPage) => {
    setFetchPage(newPage)
  }

  const activeSearchTerm = debouncedSearch.trim()
  const showNoSearchResults = !loading && !error && itineraries.length === 0 && activeSearchTerm

  return (
    <div className="form-page py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2">Browse Itineraries</h1>
          <p className="text-gray-600">Discover amazing travel experiences created by our community</p>
        </div>

        <div className="form-card mb-8 space-y-6">
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <input
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search title, destination, tags, activities, hotels…"
                className="form-input pl-10"
                aria-label="Search itineraries"
              />
            </div>
            <p className="text-xs text-gray-500">Results update shortly after you stop typing (500ms).</p>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <label className="form-label-inline">
                <MapPin className="h-4 w-4 text-gray-400" />
                Destination
              </label>
              <input
                type="text"
                value={filters.destination}
                onChange={(e) => handleFilterChange("destination", e.target.value)}
                placeholder="Any destination"
                className="form-input"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label-inline">
                <Calendar className="h-4 w-4 text-gray-400" />
                Nights
              </label>
              <select
                value={filters.nights}
                onChange={(e) => handleFilterChange("nights", e.target.value)}
                className="form-select"
              >
                <option value="">Any duration</option>
                <option value="2">2 nights</option>
                <option value="3">3 nights</option>
                <option value="4">4 nights</option>
                <option value="5">5 nights</option>
                <option value="7">7 nights</option>
                <option value="10">10+ nights</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="form-label-inline">
                <Tag className="h-4 w-4 text-gray-400" />
                Tags
              </label>
              <select
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
                className="form-select"
              >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center shadow-sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Searching itineraries…" />
        ) : error ? (
          <ErrorMessage title="Failed to load itineraries" message={error} onRetry={loadItineraries} />
        ) : itineraries.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Showing {itineraries.length} of {pagination.total} itineraries
                {activeSearchTerm ? (
                  <span className="text-foreground font-medium"> for &ldquo;{activeSearchTerm}&rdquo;</span>
                ) : null}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {itineraries.map((itinerary) => (
                <ItineraryCard key={itinerary._id} itinerary={itinerary} />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {[...Array(pagination.pages)].map((_, index) => {
                  const page = index + 1
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        pagination.page === page
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : showNoSearchResults ? (
          <div className="text-center py-16 px-4">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-60" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              No itineraries found for &lsquo;{activeSearchTerm}&rsquo;
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Try another keyword or clear filters to see more trips.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Clear search &amp; filters
            </button>
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No itineraries found"
            description="Try adjusting your search criteria or create a new itinerary to get started."
            actionText="Create Itinerary"
            actionLink="/create"
          />
        )}
      </div>
    </div>
  )
}

export default Itineraries
