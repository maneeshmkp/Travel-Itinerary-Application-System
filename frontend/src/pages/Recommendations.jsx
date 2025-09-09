"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { MapPin, Calendar, Tag, Compass, Loader2, Star } from "lucide-react"
import { recommendationAPI } from "../services/api"
import ItineraryCard from "../components/ItineraryCard"

const Recommendations = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [recommendations, setRecommendations] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(false)
  const [destinationsLoading, setDestinationsLoading] = useState(true)

  const [criteria, setCriteria] = useState({
    nights: searchParams.get("nights") || "",
    destination: searchParams.get("destination") || "",
    tags: searchParams.get("tags") || "",
    budget: searchParams.get("budget") || "",
  })

  const tagOptions = ["beach", "adventure", "cultural", "luxury", "budget", "family", "romantic", "solo"]

  // Fetch destinations on component mount
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await recommendationAPI.getDestinations()
        setDestinations(response.data.data)
      } catch (error) {
        console.error("Error fetching destinations:", error)
      } finally {
        setDestinationsLoading(false)
      }
    }

    fetchDestinations()
  }, [])

  // Fetch recommendations when criteria changes
  useEffect(() => {
    if (criteria.nights || criteria.destination || criteria.tags || criteria.budget) {
      fetchRecommendations()
    }
  }, [criteria])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(criteria).filter(([_, value]) => value !== ""))
      const response = await recommendationAPI.getRecommendations(params)
      setRecommendations(response.data.data)
    } catch (error) {
      console.error("Error fetching recommendations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCriteriaChange = (field, value) => {
    const newCriteria = { ...criteria, [field]: value }
    setCriteria(newCriteria)

    // Update URL params
    const newSearchParams = new URLSearchParams()
    Object.entries(newCriteria).forEach(([key, val]) => {
      if (val) newSearchParams.set(key, val)
    })
    setSearchParams(newSearchParams)
  }

  const clearCriteria = () => {
    setCriteria({
      nights: "",
      destination: "",
      tags: "",
      budget: "",
    })
    setSearchParams({})
    setRecommendations([])
  }

  const handleDestinationClick = (destination) => {
    handleCriteriaChange("destination", destination)
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-4">
            Get Personalized Recommendations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell us what you're looking for and we'll suggest the perfect itineraries for your next adventure
          </p>
        </div>

        {/* Criteria Form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Number of Nights
              </label>
              <select
                value={criteria.nights}
                onChange={(e) => handleCriteriaChange("nights", e.target.value)}
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
                <MapPin className="h-4 w-4 inline mr-1" />
                Destination
              </label>
              <input
                type="text"
                value={criteria.destination}
                onChange={(e) => handleCriteriaChange("destination", e.target.value)}
                placeholder="e.g., Phuket, Krabi"
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Travel Style
              </label>
              <select
                value={criteria.tags}
                onChange={(e) => handleCriteriaChange("tags", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Any style</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Budget (USD)</label>
              <input
                type="number"
                value={criteria.budget}
                onChange={(e) => handleCriteriaChange("budget", e.target.value)}
                placeholder="Max budget"
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={clearCriteria}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Popular Destinations */}
        {!loading && recommendations.length === 0 && (
          <div className="mb-8">
            <h2 className="font-heading font-semibold text-2xl text-foreground mb-6">Popular Destinations</h2>
            {destinationsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {destinations.map((destination, index) => (
                  <button
                    key={index}
                    onClick={() => handleDestinationClick(destination.destination)}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-300 text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-heading font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">
                        {destination.destination}
                      </h3>
                      <div className="flex items-center text-secondary">
                        <Star className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">{destination.itineraryCount}</span>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-3">
                      {destination.nightRange.min} - {destination.nightRange.max} nights available
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {destination.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full border border-secondary/20"
                        >
                          {tag}
                        </span>
                      ))}
                      {destination.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{destination.tags.length - 3}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommendations Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Finding perfect recommendations...</span>
          </div>
        ) : recommendations.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-semibold text-2xl text-foreground">Recommended for You</h2>
              <div className="flex items-center text-muted-foreground">
                <Compass className="h-4 w-4 mr-1" />
                <span>{recommendations.length} recommendations found</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((itinerary) => (
                <ItineraryCard key={itinerary._id} itinerary={itinerary} />
              ))}
            </div>
          </div>
        ) : (
          Object.values(criteria).some((value) => value !== "") && (
            <div className="text-center py-12">
              <Compass className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">No recommendations found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your criteria or explore our popular destinations above.
              </p>
              <button
                onClick={clearCriteria}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md font-medium transition-colors"
              >
                Clear Criteria
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Recommendations
