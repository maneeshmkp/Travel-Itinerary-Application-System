"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Hotel,
  Activity,
  Tag,
  DollarSign,
  Star,
  Share2,
  Heart,
  Loader2,
} from "lucide-react"
import { itineraryAPI, recommendationAPI } from "../services/api"

const ItineraryDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [itinerary, setItinerary] = useState(null)
  const [similarItineraries, setSimilarItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [similarLoading, setSimilarLoading] = useState(false)

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const response = await itineraryAPI.getById(id)
        setItinerary(response.data.data)

        // Fetch similar itineraries
        setSimilarLoading(true)
        try {
          const similarResponse = await recommendationAPI.getSimilar(id)
          setSimilarItineraries(similarResponse.data.data)
        } catch (error) {
          console.error("Error fetching similar itineraries:", error)
        } finally {
          setSimilarLoading(false)
        }
      } catch (error) {
        console.error("Error fetching itinerary:", error)
        navigate("/itineraries")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchItinerary()
    }
  }, [id, navigate])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getCategoryIcon = (category) => {
    const icons = {
      sightseeing: "🏛️",
      adventure: "🏔️",
      cultural: "🎭",
      relaxation: "🧘",
      dining: "🍽️",
      shopping: "🛍️",
    }
    return icons[category] || "📍"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Itinerary not found</h2>
          <p className="text-muted-foreground mb-4">The itinerary you're looking for doesn't exist.</p>
          <Link
            to="/itineraries"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md font-medium transition-colors"
          >
            Browse Itineraries
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Itineraries
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-4">{itinerary.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{itinerary.destination}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    {itinerary.numberOfNights} nights, {itinerary.totalDays} days
                  </span>
                </div>
                {itinerary.bestTimeToVisit && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Best time: {itinerary.bestTimeToVisit}</span>
                  </div>
                )}
              </div>

              {itinerary.description && (
                <p className="text-foreground text-lg leading-relaxed">{itinerary.description}</p>
              )}
            </div>

            <div className="lg:w-80">
              <div className="bg-card border border-border rounded-lg p-6">
                {itinerary.budget && (itinerary.budget.min || itinerary.budget.max) && (
                  <div className="flex items-center mb-4">
                    <DollarSign className="h-5 w-5 text-primary mr-2" />
                    <span className="font-medium text-card-foreground">
                      Budget: ${itinerary.budget.min || 0} - ${itinerary.budget.max || "∞"}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground text-sm">Created {formatDate(itinerary.createdAt)}</span>
                  {itinerary.isRecommended && (
                    <div className="flex items-center text-secondary">
                      <Star className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">Recommended</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center">
                    <Heart className="h-4 w-4 mr-2" />
                    Save
                  </button>
                  <button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Highlights */}
            {itinerary.highlights && itinerary.highlights.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-heading font-semibold text-xl text-card-foreground mb-4">Highlights</h2>
                <ul className="space-y-2">
                  {itinerary.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-card-foreground">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Daily Itinerary */}
            <div className="space-y-6">
              <h2 className="font-heading font-semibold text-2xl text-foreground">Daily Itinerary</h2>

              {itinerary.days.map((day, index) => (
                <div key={day._id} className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-xl text-card-foreground mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Day {day.dayNumber}
                  </h3>

                  {/* Hotel */}
                  <div className="mb-6">
                    <h4 className="font-medium text-card-foreground mb-3 flex items-center">
                      <Hotel className="h-4 w-4 mr-2 text-primary" />
                      Accommodation
                    </h4>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-foreground">{day.hotel.name}</h5>
                        {day.hotel.rating && (
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < day.hotel.rating ? "text-secondary fill-current" : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-muted-foreground flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {day.hotel.location}
                      </p>
                    </div>
                  </div>

                  {/* Activities */}
                  {day.activities && day.activities.length > 0 && (
                    <div>
                      <h4 className="font-medium text-card-foreground mb-3 flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-primary" />
                        Activities
                      </h4>
                      <div className="space-y-4">
                        {day.activities.map((activity, activityIndex) => (
                          <div key={activity._id} className="bg-muted rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <span className="text-lg mr-2">{getCategoryIcon(activity.category)}</span>
                                <h5 className="font-medium text-foreground">{activity.name}</h5>
                              </div>
                              {activity.time && (
                                <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded">
                                  {activity.time}
                                </span>
                              )}
                            </div>

                            <p className="text-muted-foreground mb-2">{activity.description}</p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {activity.location}
                              </div>
                              {activity.duration && (
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {activity.duration}
                                </div>
                              )}
                              <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs border border-secondary/20">
                                {activity.category}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            {itinerary.tags && itinerary.tags.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {itinerary.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary border border-secondary/20"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Itineraries */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Similar Itineraries</h3>
              {similarLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading suggestions...</p>
                </div>
              ) : similarItineraries.length > 0 ? (
                <div className="space-y-4">
                  {similarItineraries.slice(0, 3).map((similar) => (
                    <Link
                      key={similar._id}
                      to={`/itineraries/${similar._id}`}
                      className="block p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <h4 className="font-medium text-card-foreground mb-1 line-clamp-2">{similar.title}</h4>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{similar.destination}</span>
                        <span className="mx-2">•</span>
                        <span>{similar.numberOfNights} nights</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No similar itineraries found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItineraryDetail
