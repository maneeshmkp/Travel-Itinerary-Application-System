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
  Sparkles,
} from "lucide-react"
import { itineraryAPI, recommendationAPI, aiAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"
import DestinationHeroImage from "../components/DestinationHeroImage"

const LOGIN_SAVE_MESSAGE = "Please log in to save itineraries"

function itineraryToAiSnapshot(it) {
  if (!it) return null
  return {
    title: it.title,
    destination: it.destination,
    numberOfNights: it.numberOfNights,
    totalDays: it.totalDays,
    description: it.description,
    highlights: it.highlights || [],
    tags: it.tags || [],
    budget: it.budget,
    days: (it.days || []).map((d) => ({
      dayNumber: d.dayNumber,
      dayLabel: d.dayLabel || "",
      hotel: d.hotel,
      activities: (d.activities || []).map((a) => ({
        name: a.name,
        description: a.description,
        time: a.time,
        location: a.location,
        category: a.category,
        duration: a.duration,
      })),
    })),
  }
}

const ItineraryDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [itinerary, setItinerary] = useState(null)
  const [similarItineraries, setSimilarItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const response = await itineraryAPI.getById(id)
        setItinerary(response.data.data)

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

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setSaved(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await itineraryAPI.checkSaved(id)
        if (!cancelled) setSaved(Boolean(res.data?.saved))
      } catch {
        if (!cancelled) setSaved(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated])

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

  const handleSaveClick = async () => {
    if (!id) return

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: { pathname: `/itineraries/${id}`, search: "" },
          message: LOGIN_SAVE_MESSAGE,
        },
      })
      return
    }

    setSaveLoading(true)
    try {
      if (saved) {
        await itineraryAPI.unsaveForUser(id)
        setSaved(false)
        showSuccess("Removed from saved")
      } else {
        await itineraryAPI.saveForUser(id)
        setSaved(true)
        showSuccess("Itinerary saved")
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not update saved itinerary."
      showError(msg)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleShare = async () => {
    if (!itinerary) return

    const url = window.location.href
    const shareData = {
      title: itinerary.title,
      text: "Check out this itinerary on TravelPlan",
      url,
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData)
        showSuccess("Shared successfully")
        return
      } catch (err) {
        if (err?.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showSuccess("Link copied to clipboard")
    } catch {
      showError("Could not copy the link. Copy it from the address bar.")
    }
  }

  const handleAiTripSummary = async () => {
    if (!itinerary) return
    setAiSummaryLoading(true)
    try {
      const snap = itineraryToAiSnapshot(itinerary)
      const res = await aiAPI.tripSummary({ itinerary: snap })
      const summary = res.data?.data?.summary
      const demo = res.data?.demo
      if (!summary) {
        showError("No summary returned.")
        return
      }
      const text = `${summary}\n\n${window.location.href}`
      await navigator.clipboard.writeText(text)
      showSuccess(
        demo
          ? "AI summary + link copied (demo). Set GEMINI_API_KEY or OPENAI_API_KEY on the server for richer copy."
          : "AI summary and link copied to clipboard.",
      )
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Could not generate summary.")
    } finally {
      setAiSummaryLoading(false)
    }
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
      {toasts.map((toast) => (
        <Toast key={toast.id} type={toast.type} message={toast.message} onClose={() => removeToast(toast.id)} />
      ))}

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
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

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveClick}
                      disabled={saveLoading}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                        saved
                          ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                      aria-pressed={saved}
                    >
                      {saveLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      ) : (
                        <Heart
                          className={`h-4 w-4 shrink-0 ${saved ? "fill-red-500 text-red-500 stroke-red-500" : "text-primary-foreground fill-transparent"}`}
                        />
                      )}
                      <span>{saved ? "Saved" : "Save"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center shrink-0"
                      title="Share itinerary"
                      aria-label="Share itinerary"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiTripSummary}
                    disabled={aiSummaryLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/25 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 disabled:opacity-60 transition-colors"
                  >
                    {aiSummaryLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Sparkles className="h-4 w-4 shrink-0" />
                    )}
                    AI trip summary (copy)
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

              {itinerary.days.map((day) => (
                <div key={day._id} className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-xl text-card-foreground mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-primary shrink-0" />
                      Day {day.dayNumber}
                    </span>
                    {(day.dayLabel || "").trim() ? (
                      <span className="text-card-foreground font-medium">— {(day.dayLabel || "").trim()}</span>
                    ) : null}
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
                        {day.activities.map((activity) => (
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
                      className="block border border-border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors group"
                    >
                      <DestinationHeroImage
                        destination={similar.destination}
                        heightClass="h-28"
                        roundedClass="rounded-t-lg"
                        badge={
                          <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-semibold shadow">
                            {similar.numberOfNights} nights
                          </span>
                        }
                      />
                      <div className="p-3">
                        <h4 className="font-medium text-card-foreground mb-1 line-clamp-2">{similar.title}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1 shrink-0" />
                          <span className="truncate">{similar.destination}</span>
                        </div>
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
