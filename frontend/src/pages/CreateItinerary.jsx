"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Minus, Calendar, Hotel, Activity, Save, ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { itineraryAPI, aiAPI } from "../services/api"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"
import { ITINERARY_TAG_OPTIONS } from "../constants/itineraryTags"

function manualHighlightsEmpty(highlights) {
  return !highlights?.some((h) => String(h).trim())
}

function buildItineraryAiPayload(formData) {
  return {
    title: formData.title,
    destination: formData.destination,
    tags: formData.tags,
    highlights: (formData.highlights || []).filter((h) => String(h).trim()),
    days: formData.days.map((d) => ({
      dayNumber: d.dayNumber,
      dayLabel: d.dayLabel || "",
      hotel: d.hotel,
      activities: d.activities.map((a) => ({
        name: a.name,
        description: a.description,
        time: a.time,
        location: a.location,
        category: a.category,
      })),
    })),
  }
}

/** When AI or network is unavailable, derive simple bullets from activity titles. */
function localFallbackHighlights(formData) {
  const dest = String(formData.destination || "").trim() || "your destination"
  const out = []
  for (const day of formData.days || []) {
    for (const a of day.activities || []) {
      const name = String(a.name || "").trim()
      if (!name) continue
      const loc = String(a.location || "").trim()
      out.push((loc ? `${name} — ${loc}` : name).slice(0, 95))
      if (out.length >= 8) break
    }
    if (out.length >= 8) break
  }
  const uniq = [...new Set(out)]
  if (uniq.length >= 3) return uniq.slice(0, 6)
  if (uniq.length > 0) {
    const extras = [
      `More to discover in ${dest}`,
      "Dining, culture & neighborhood walks",
      "Thoughtful pacing across your stay",
    ]
    let i = 0
    while (uniq.length < 3) {
      uniq.push(extras[i % extras.length])
      i += 1
    }
    return uniq.slice(0, 6)
  }
  return [`Explore ${dest}`, "Curated stops across your days", "Culture, food & scenery"]
}

const CreateItinerary = () => {
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(false)
  /** null | 'enrich' | number (dayIndex) for suggest-day */
  const [aiBusy, setAiBusy] = useState(null)
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    numberOfNights: 3,
    description: "",
    budget: {
      min: "",
      max: "",
      currency: "USD",
    },
    bestTimeToVisit: "",
    highlights: [""],
    tags: [],
    days: [
      {
        dayNumber: 1,
        dayLabel: "",
        hotel: {
          name: "",
          location: "",
          rating: 4,
          checkIn: "",
          checkOut: "",
        },
        transfers: [],
        activities: [
          {
            name: "",
            description: "",
            time: "",
            location: "",
            category: "sightseeing",
            duration: "2-3 hours",
          },
        ],
        meals: [],
      },
    ],
  })

  const tagOptions = ITINERARY_TAG_OPTIONS
  const activityCategories = ["sightseeing", "adventure", "cultural", "relaxation", "dining", "shopping"]

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleBudgetChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        [field]: value,
      },
    }))
  }

  const handleHighlightChange = (index, value) => {
    const newHighlights = [...formData.highlights]
    newHighlights[index] = value
    setFormData((prev) => ({
      ...prev,
      highlights: newHighlights,
    }))
  }

  const addHighlight = () => {
    setFormData((prev) => ({
      ...prev,
      highlights: [...prev.highlights, ""],
    }))
  }

  const removeHighlight = (index) => {
    setFormData((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }))
  }

  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  const handleDayChange = (dayIndex, field, value) => {
    const newDays = [...formData.days]
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      newDays[dayIndex][parent][child] = value
    } else {
      newDays[dayIndex][field] = value
    }
    setFormData((prev) => ({
      ...prev,
      days: newDays,
    }))
  }

  const handleActivityChange = (dayIndex, activityIndex, field, value) => {
    const newDays = [...formData.days]
    newDays[dayIndex].activities[activityIndex][field] = value
    setFormData((prev) => ({
      ...prev,
      days: newDays,
    }))
  }

  const addActivity = (dayIndex) => {
    const newDays = [...formData.days]
    newDays[dayIndex].activities.push({
      name: "",
      description: "",
      time: "",
      location: "",
      category: "sightseeing",
      duration: "2-3 hours",
    })
    setFormData((prev) => ({
      ...prev,
      days: newDays,
    }))
  }

  const removeActivity = (dayIndex, activityIndex) => {
    const newDays = [...formData.days]
    newDays[dayIndex].activities = newDays[dayIndex].activities.filter((_, i) => i !== activityIndex)
    setFormData((prev) => ({
      ...prev,
      days: newDays,
    }))
  }

  const addDay = () => {
    const newDayNumber = formData.days.length + 1
    setFormData((prev) => ({
      ...prev,
      numberOfNights: prev.numberOfNights + 1,
      days: [
        ...prev.days,
        {
          dayNumber: newDayNumber,
          dayLabel: "",
          hotel: {
            name: "",
            location: "",
            rating: 4,
            checkIn: "",
            checkOut: "",
          },
          transfers: [],
          activities: [
            {
              name: "",
              description: "",
              time: "",
              location: "",
              category: "sightseeing",
              duration: "2-3 hours",
            },
          ],
          meals: [],
        },
      ],
    }))
  }

  const removeDay = (dayIndex) => {
    if (formData.days.length > 1) {
      const newDays = formData.days.filter((_, i) => i !== dayIndex)
      // Renumber days
      newDays.forEach((day, index) => {
        day.dayNumber = index + 1
      })
      setFormData((prev) => ({
        ...prev,
        numberOfNights: prev.numberOfNights - 1,
        days: newDays,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        showError("Please enter a title for your itinerary")
        return
      }
      if (!formData.destination.trim()) {
        showError("Please enter a destination")
        return
      }

      // Check if all days have hotels and at least one activity
      for (let i = 0; i < formData.days.length; i++) {
        const day = formData.days[i]
        if (!day.hotel.name.trim() || !day.hotel.location.trim()) {
          showError(`Please complete hotel information for Day ${day.dayNumber}`)
          return
        }
        if (day.activities.length === 0 || !day.activities[0].name.trim()) {
          showError(`Please add at least one activity for Day ${day.dayNumber}`)
          return
        }
      }

      const totalDays = formData.days.length

      let finalHighlights = formData.highlights.filter((h) => h.trim() !== "")
      if (finalHighlights.length === 0) {
        try {
          const res = await aiAPI.suggestHighlights({ itinerary: buildItineraryAiPayload(formData) })
          const list = res.data?.data?.highlights
          if (Array.isArray(list) && list.some((x) => String(x).trim())) {
            finalHighlights = list.map((h) => String(h).trim()).filter(Boolean)
          } else {
            finalHighlights = localFallbackHighlights(formData)
          }
        } catch {
          finalHighlights = localFallbackHighlights(formData)
        }
      }

      const cleanedData = {
        ...formData,
        totalDays,
        highlights: finalHighlights,
        budget: {
          min: Number(formData.budget.min) || undefined,
          max: Number(formData.budget.max) || undefined,
          currency: formData.budget.currency,
        },
      }

      const response = await itineraryAPI.create(cleanedData)
      showSuccess("Itinerary created successfully!")

      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate(`/itineraries/${response.data.data._id}`)
      }, 1500)
    } catch (error) {
      console.error("Error creating itinerary:", error)
      const errorMessage = error.response?.data?.error || "Failed to create itinerary. Please try again."
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAiEnrichDescriptions = async () => {
    if (!formData.destination.trim()) {
      showError("Add a destination before using AI enrich.")
      return
    }
    setAiBusy("enrich")
    try {
      const itineraryPayload = {
        title: formData.title,
        destination: formData.destination,
        highlights: formData.highlights.filter((h) => h.trim()),
        tags: formData.tags,
        days: formData.days.map((d) => ({
          dayNumber: d.dayNumber,
          dayLabel: d.dayLabel || "",
          hotel: d.hotel,
          activities: d.activities.map((a) => ({
            name: a.name,
            description: a.description,
            time: a.time,
            location: a.location,
            category: a.category,
          })),
        })),
      }
      const res = await aiAPI.enrichDescriptions({ itinerary: itineraryPayload })
      const { description, days } = res.data.data
      const demo = res.data.demo

      const nextDays = formData.days.map((day, di) => {
        const patch = days?.find((x) => x.dayIndex === di)
        if (!patch?.activities) return day
        const activities = day.activities.map((act, ai) => {
          const p = patch.activities.find((x) => x.activityIndex === ai)
          if (p?.description) return { ...act, description: p.description }
          return act
        })
        return { ...day, activities }
      })
      const nextDescription = description || formData.description

      let nextHighlights = formData.highlights
      if (manualHighlightsEmpty(formData.highlights)) {
        const snapshot = { ...formData, days: nextDays, description: nextDescription }
        try {
          const hr = await aiAPI.suggestHighlights({ itinerary: buildItineraryAiPayload(snapshot) })
          const list = hr.data?.data?.highlights
          if (Array.isArray(list) && list.some((x) => String(x).trim())) {
            nextHighlights = list.map((h) => String(h).trim()).filter(Boolean)
          } else {
            nextHighlights = localFallbackHighlights(snapshot)
          }
        } catch {
          nextHighlights = localFallbackHighlights(snapshot)
        }
      }

      setFormData((prev) => ({
        ...prev,
        description: nextDescription,
        days: nextDays,
        highlights: manualHighlightsEmpty(prev.highlights) ? nextHighlights : prev.highlights,
      }))
      showSuccess(demo ? "Descriptions filled (demo mode — add GEMINI_API_KEY or OPENAI_API_KEY for live AI)." : "Descriptions updated with AI.")
    } catch (err) {
      showError(err.response?.data?.message || err.message || "AI request failed.")
    } finally {
      setAiBusy(null)
    }
  }

  const handleAiSuggestDay = async (dayIndex) => {
    const day = formData.days[dayIndex]
    if (!formData.destination.trim()) {
      showError("Add a destination first.")
      return
    }
    if (!day.hotel?.name?.trim() || !day.hotel?.location?.trim()) {
      showError(`Fill hotel name and area for Day ${day.dayNumber} before AI suggestions.`)
      return
    }
    setAiBusy(dayIndex)
    try {
      const res = await aiAPI.suggestDay({
        destination: formData.destination.trim(),
        dayNumber: day.dayNumber,
        dayLabel: (day.dayLabel || "").trim(),
        hotel: day.hotel,
        tags: formData.tags,
        existingActivities: day.activities,
      })
      const list = res.data.data?.activities || []
      const allowed = ["sightseeing", "adventure", "cultural", "relaxation", "dining", "shopping"]
      const normalized = list.map((a) => ({
        name: String(a.name || "Activity").slice(0, 120),
        description: String(a.description || "").slice(0, 800),
        time: String(a.time || "10:00"),
        location: String(a.location || formData.destination).slice(0, 200),
        category: allowed.includes(a.category) ? a.category : "sightseeing",
        duration: String(a.duration || "2 hours").slice(0, 40),
      }))
      if (normalized.length === 0) {
        showError("AI returned no activities. Try again.")
        return
      }

      const snapDays = formData.days.map((d, i) => (i === dayIndex ? { ...d, activities: normalized } : d))
      let newHighlights = formData.highlights
      if (manualHighlightsEmpty(formData.highlights)) {
        const snapshot = { ...formData, days: snapDays }
        try {
          const hr = await aiAPI.suggestHighlights({ itinerary: buildItineraryAiPayload(snapshot) })
          const list = hr.data?.data?.highlights
          if (Array.isArray(list) && list.some((x) => String(x).trim())) {
            newHighlights = list.map((h) => String(h).trim()).filter(Boolean)
          } else {
            newHighlights = localFallbackHighlights(snapshot)
          }
        } catch {
          newHighlights = localFallbackHighlights(snapshot)
        }
      }

      setFormData((prev) => {
        const days = [...prev.days]
        days[dayIndex] = { ...days[dayIndex], activities: normalized }
        return {
          ...prev,
          days,
          highlights: manualHighlightsEmpty(prev.highlights) ? newHighlights : prev.highlights,
        }
      })
      showSuccess(
        res.data.demo
          ? "Sample activities applied (demo). Set GEMINI_API_KEY or OPENAI_API_KEY for tailored suggestions."
          : "Activities updated from AI.",
      )
    } catch (err) {
      showError(err.response?.data?.message || err.message || "AI request failed.")
    } finally {
      setAiBusy(null)
    }
  }

  return (
    <div className="form-page py-8">
      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast key={toast.id} type={toast.type} message={toast.message} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Create New Itinerary</h1>
          <p className="text-muted-foreground">Plan your perfect trip with detailed day-by-day activities</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="form-card space-y-5">
            <h2 className="font-heading font-semibold text-xl text-gray-900">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="form-input"
                  placeholder="Enter itinerary title"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Destination *</label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                  className="form-input"
                  placeholder="e.g. Phuket, Thailand"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="form-label mb-0">Description</label>
                <button
                  type="button"
                  onClick={handleAiEnrichDescriptions}
                  disabled={aiBusy !== null}
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors shrink-0"
                >
                  {aiBusy === "enrich" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI: Enrich descriptions
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="form-textarea min-h-[88px]"
                placeholder="Describe your itinerary… or use AI to draft copy from your days."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1">
                <label className="form-label">Budget Min ($)</label>
                <input
                  type="number"
                  value={formData.budget.min}
                  onChange={(e) => handleBudgetChange("min", e.target.value)}
                  className="form-input"
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Budget Max ($)</label>
                <input
                  type="number"
                  value={formData.budget.max}
                  onChange={(e) => handleBudgetChange("max", e.target.value)}
                  className="form-input"
                  placeholder="2000"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Best Time to Visit</label>
                <input
                  type="text"
                  value={formData.bestTimeToVisit}
                  onChange={(e) => handleInputChange("bestTimeToVisit", e.target.value)}
                  className="form-input"
                  placeholder="November - March"
                />
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="form-card space-y-5">
            <h2 className="font-heading font-semibold text-xl text-gray-900">Highlights</h2>
            {formData.highlights.map((highlight, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  className="form-input flex-1"
                  placeholder="e.g. Sunset viewpoints, local food tour"
                />
                {formData.highlights.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="text-destructive hover:text-destructive/80 p-2"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addHighlight}
              className="text-primary hover:text-primary/80 text-sm flex items-center mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Highlight
            </button>
          </div>

          {/* Tags */}
          <div className="form-card space-y-5">
            <h2 className="font-heading font-semibold text-xl text-gray-900">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 ${
                    formData.tags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-xl text-gray-900">
                Daily Itinerary ({formData.numberOfNights} nights, {formData.days.length} days)
              </h2>
              <button
                type="button"
                onClick={addDay}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Day
              </button>
            </div>

            {formData.days.map((day, dayIndex) => (
              <div key={dayIndex} className="form-card space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-heading font-semibold text-lg text-gray-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-primary shrink-0" />
                      Day {day.dayNumber}
                    </span>
                    {(day.dayLabel || "").trim() ? (
                      <span className="text-gray-700 font-medium">— {(day.dayLabel || "").trim()}</span>
                    ) : null}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => handleAiSuggestDay(dayIndex)}
                      disabled={aiBusy !== null}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/15 disabled:opacity-50 transition-colors"
                    >
                      {aiBusy === dayIndex ? (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0" />
                      )}
                      AI: Suggest activities
                    </button>
                    {formData.days.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDay(dayIndex)}
                        className="text-destructive hover:text-destructive/80 p-2"
                        aria-label={`Remove day ${day.dayNumber}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="form-label">Day route / theme (optional)</label>
                  <input
                    type="text"
                    value={day.dayLabel ?? ""}
                    onChange={(e) => handleDayChange(dayIndex, "dayLabel", e.target.value)}
                    className="form-input"
                    placeholder="e.g. Jammu Arrival → Katra, or Vaishno Devi Darshan → Srinagar"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown as <span className="font-medium">Day {day.dayNumber} — …</span>. AI uses this when you click
                    Suggest activities.
                  </p>
                </div>

                {/* Hotel */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                    <Hotel className="h-4 w-4 mr-2 text-primary" />
                    Hotel
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <input
                      type="text"
                      value={day.hotel.name}
                      onChange={(e) => handleDayChange(dayIndex, "hotel.name", e.target.value)}
                      className="form-input"
                      placeholder="Hotel name *"
                      required
                    />
                    <input
                      type="text"
                      value={day.hotel.location}
                      onChange={(e) => handleDayChange(dayIndex, "hotel.location", e.target.value)}
                      className="form-input"
                      placeholder="Hotel area or address *"
                      required
                    />
                  </div>
                </div>

                {/* Activities */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-primary" />
                      Activities
                    </h4>
                    <button
                      type="button"
                      onClick={() => addActivity(dayIndex)}
                      className="text-primary hover:text-primary/80 text-sm flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Activity
                    </button>
                  </div>

                  {day.activities.map((activity, activityIndex) => (
                    <div
                      key={activityIndex}
                      className="rounded-xl border border-gray-100 bg-gray-50/90 p-5 mb-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Activity {activityIndex + 1}
                        </span>
                        {day.activities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeActivity(dayIndex, activityIndex)}
                            className="text-destructive hover:text-destructive/80 p-1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          value={activity.name}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "name", e.target.value)}
                          className="form-input"
                          placeholder="Activity name *"
                          required
                        />
                        <input
                          type="text"
                          value={activity.location}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "location", e.target.value)}
                          className="form-input"
                          placeholder="Location *"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input
                          type="text"
                          value={activity.time}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "time", e.target.value)}
                          className="form-input"
                          placeholder="Time (e.g., 9:00 AM)"
                        />
                        <select
                          value={activity.category}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "category", e.target.value)}
                          className="form-select"
                        >
                          {activityCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={activity.duration}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "duration", e.target.value)}
                          className="form-input"
                          placeholder="Duration"
                        />
                      </div>

                      <textarea
                        value={activity.description}
                        onChange={(e) => handleActivityChange(dayIndex, activityIndex, "description", e.target.value)}
                        rows={2}
                        className="form-textarea min-h-[72px]"
                        placeholder="Activity description *"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Itinerary
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateItinerary
