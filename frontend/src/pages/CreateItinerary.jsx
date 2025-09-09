"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Minus, Calendar, Hotel, Activity, Save, ArrowLeft } from "lucide-react"
import { itineraryAPI } from "../services/api"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"

const CreateItinerary = () => {
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(false)
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

  const tagOptions = ["beach", "adventure", "cultural", "luxury", "budget", "family", "romantic", "solo"]
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

      // Filter out empty highlights
      const cleanedData = {
        ...formData,
        highlights: formData.highlights.filter((h) => h.trim() !== ""),
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

  return (
    <div className="min-h-screen bg-background py-8">
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
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-heading font-semibold text-xl text-card-foreground mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Amazing Phuket Adventure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Destination *</label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Phuket, Thailand"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-card-foreground mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe your itinerary..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Budget Min ($)</label>
                <input
                  type="number"
                  value={formData.budget.min}
                  onChange={(e) => handleBudgetChange("min", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Budget Max ($)</label>
                <input
                  type="number"
                  value={formData.budget.max}
                  onChange={(e) => handleBudgetChange("max", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Best Time to Visit</label>
                <input
                  type="text"
                  value={formData.bestTimeToVisit}
                  onChange={(e) => handleInputChange("bestTimeToVisit", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="November - March"
                />
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-heading font-semibold text-xl text-card-foreground mb-4">Highlights</h2>
            {formData.highlights.map((highlight, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Beautiful beaches and crystal clear waters"
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
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-heading font-semibold text-xl text-card-foreground mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    formData.tags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary"
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
              <h2 className="font-heading font-semibold text-xl text-foreground">
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
              <div key={dayIndex} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Day {day.dayNumber}
                  </h3>
                  {formData.days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDay(dayIndex)}
                      className="text-destructive hover:text-destructive/80 p-2"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Hotel */}
                <div className="mb-6">
                  <h4 className="font-medium text-card-foreground mb-3 flex items-center">
                    <Hotel className="h-4 w-4 mr-2 text-primary" />
                    Hotel
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={day.hotel.name}
                      onChange={(e) => handleDayChange(dayIndex, "hotel.name", e.target.value)}
                      className="px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Hotel name *"
                      required
                    />
                    <input
                      type="text"
                      value={day.hotel.location}
                      onChange={(e) => handleDayChange(dayIndex, "hotel.location", e.target.value)}
                      className="px-3 py-2 border border-border rounded-md bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Hotel location *"
                      required
                    />
                  </div>
                </div>

                {/* Activities */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-card-foreground flex items-center">
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
                    <div key={activityIndex} className="border border-border rounded-md p-4 mb-3 bg-muted">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">Activity {activityIndex + 1}</span>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={activity.name}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "name", e.target.value)}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Activity name *"
                          required
                        />
                        <input
                          type="text"
                          value={activity.location}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "location", e.target.value)}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Location *"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <input
                          type="text"
                          value={activity.time}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "time", e.target.value)}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Time (e.g., 9:00 AM)"
                        />
                        <select
                          value={activity.category}
                          onChange={(e) => handleActivityChange(dayIndex, activityIndex, "category", e.target.value)}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Duration"
                        />
                      </div>

                      <textarea
                        value={activity.description}
                        onChange={(e) => handleActivityChange(dayIndex, activityIndex, "description", e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-6 py-2 rounded-md font-medium transition-colors flex items-center"
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
