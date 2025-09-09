"use client"

import { useState, useEffect } from "react"
import { Search, Filter, MapPin, Calendar, Tag } from "lucide-react"
import { itineraryAPI } from "../services/api"
import ItineraryCard from "../components/ItineraryCard"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import EmptyState from "../components/EmptyState"

const Itineraries = () => {
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    destination: "",
    nights: "",
    tags: "",
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  })

  const tagOptions = ["beach", "adventure", "cultural", "luxury", "budget", "family", "romantic", "solo"]

  const fetchItineraries = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(searchTerm && { destination: searchTerm }),
        ...(filters.destination && { destination: filters.destination }),
        ...(filters.nights && { nights: filters.nights }),
        ...(filters.tags && { tags: filters.tags }),
      }

      const response = await itineraryAPI.getAll(params)
      setItineraries(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error("Error fetching itineraries:", error)
      setError("Failed to load itineraries. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItineraries()
  }, [searchTerm, filters])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchItineraries(1)
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilters({
      destination: "",
      nights: "",
      tags: "",
    })
  }

  const handlePageChange = (newPage) => {
    fetchItineraries(newPage)
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Browse Itineraries</h1>
          <p className="text-muted-foreground">Discover amazing travel experiences created by our community</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by destination..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </form>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Destination
              </label>
              <input
                type="text"
                value={filters.destination}
                onChange={(e) => handleFilterChange("destination", e.target.value)}
                placeholder="Any destination"
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Nights
              </label>
              <select
                value={filters.nights}
                onChange={(e) => handleFilterChange("nights", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Tags
              </label>
              <select
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <LoadingSpinner size="lg" text="Loading itineraries..." />
        ) : error ? (
          <ErrorMessage title="Failed to load itineraries" message={error} onRetry={() => fetchItineraries()} />
        ) : itineraries.length > 0 ? (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Showing {itineraries.length} of {pagination.total} itineraries
              </p>
            </div>

            {/* Itinerary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {itineraries.map((itinerary) => (
                <ItineraryCard key={itinerary._id} itinerary={itinerary} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
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
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
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
