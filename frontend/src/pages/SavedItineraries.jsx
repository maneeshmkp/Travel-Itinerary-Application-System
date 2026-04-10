"use client"

import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { Bookmark, MapPin } from "lucide-react"
import { itineraryAPI } from "../services/api"
import ItineraryCard from "../components/ItineraryCard"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"

const SavedItineraries = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await itineraryAPI.getMySaved()
      setItems(res.data?.data ?? [])
    } catch (e) {
      console.error(e)
      setError("Could not load saved itineraries.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="form-page py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2 flex items-center gap-2">
              <Bookmark className="h-8 w-8 text-primary" />
              Saved Itineraries
            </h1>
            <p className="text-gray-600">Trips you have bookmarked for later.</p>
          </div>
          <Link
            to="/itineraries"
            className="text-primary font-semibold hover:text-primary/90 text-sm w-fit"
          >
            Browse all →
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Loading saved trips…" />
        ) : error ? (
          <ErrorMessage title="Something went wrong" message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <div className="form-card text-center py-16">
            <Bookmark className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-2">No saved itineraries yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Open any itinerary and tap <strong>Save</strong> to add it here.
            </p>
            <Link
              to="/itineraries"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-primary/90 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Explore itineraries
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((itinerary) => (
              <ItineraryCard key={itinerary._id} itinerary={itinerary} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SavedItineraries
