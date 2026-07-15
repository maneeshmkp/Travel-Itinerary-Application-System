"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  MapPin,
  Calendar,
  Hotel,
  Activity,
  Save,
  Wallet,
} from "lucide-react"
import { aiAPI, itineraryAPI } from "../services/api"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"
import { ITINERARY_TAG_OPTIONS } from "../constants/itineraryTags"
import { formatMoney } from "../utils/budgetCalculations"
import { maybeAutoDownloadTrip } from "../offline/tripDownload"

const INTEREST_SUGGESTIONS = [
  "temples",
  "beaches",
  "food & street eats",
  "hiking",
  "wildlife",
  "museums",
  "nightlife",
  "shopping",
  "photography",
  "wellness",
]

function toggleInterest(list, value) {
  const v = value.trim()
  if (!v) return list
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export default function AiPersonalizedItinerary() {
  const navigate = useNavigate()
  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [demo, setDemo] = useState(false)
  const [generated, setGenerated] = useState(null)

  const [destination, setDestination] = useState("")
  const [numberOfNights, setNumberOfNights] = useState(3)
  const [budgetMin, setBudgetMin] = useState(500)
  const [budgetMax, setBudgetMax] = useState(1200)
  const [travelStyle, setTravelStyle] = useState("cultural")
  const [interests, setInterests] = useState(["temples", "food & street eats"])
  const [customInterest, setCustomInterest] = useState("")

  const addCustomInterest = () => {
    const v = customInterest.trim()
    if (!v) return
    setInterests((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setCustomInterest("")
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (interests.length === 0) {
      showError("Select or add at least one interest")
      return
    }
    if (budgetMax < budgetMin) {
      showError("Budget max must be greater than or equal to min")
      return
    }

    setGenerating(true)
    setGenerated(null)
    try {
      const res = await aiAPI.generateItinerary({
        destination: destination.trim() || undefined,
        numberOfNights,
        budget: { min: Number(budgetMin), max: Number(budgetMax), currency: "USD" },
        travelStyle,
        interests,
      })
      const itinerary = res.data?.data?.itinerary
      if (!itinerary) throw new Error("No itinerary returned")
      setGenerated(itinerary)
      setDemo(Boolean(res.data?.demo))
      showSuccess(
        res.data?.busyFallback
          ? "AI providers were busy or over quota—we generated a starter itinerary you can save and edit. Check API billing/quotas for full AI plans."
          : res.data?.demo
            ? "Demo itinerary generated. Verify GEMINI_API_KEY / OPENAI_API_KEY billing and quotas for full AI personalization."
            : "Your personalized itinerary is ready!",
      )
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || "Could not generate itinerary")
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generated) return
    setSaving(true)
    try {
      const payload = {
        title: generated.title,
        destination: generated.destination,
        numberOfNights: generated.numberOfNights,
        description: generated.description,
        budget: generated.budget,
        bestTimeToVisit: generated.bestTimeToVisit,
        highlights: generated.highlights || [],
        tags: generated.tags || [travelStyle],
        days: (generated.days || []).map((day) => ({
          dayNumber: day.dayNumber,
          dayLabel: day.dayLabel || "",
          hotel: day.hotel,
          transfers: day.transfers || [],
          activities: (day.activities || []).map((a) => {
            const act = {
              name: a.name,
              description: a.description,
              time: a.time,
              location: a.location,
              category: a.category,
              duration: a.duration || "2-3 hours",
              cost: a.cost ?? 0,
            }
            const lat = Number(a.latitude)
            const lng = Number(a.longitude)
            if (Number.isFinite(lat) && lat >= -90 && lat <= 90) act.latitude = lat
            if (Number.isFinite(lng) && lng >= -180 && lng <= 180) act.longitude = lng
            if (a.geocodedName) act.geocodedName = a.geocodedName
            return act
          }),
          meals: day.meals || [],
        })),
      }
      const res = await itineraryAPI.create(payload)
      const id = res.data?.data?._id
      if (id) maybeAutoDownloadTrip(id)
      showSuccess("Itinerary saved!")
      if (id) navigate(`/itineraries/${id}`)
    } catch (err) {
      showError(err?.response?.data?.error || err?.message || "Could not save itinerary")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-page py-8">
      {toasts.map((toast) => (
        <Toast key={toast.id} type={toast.type} message={toast.message} onClose={() => removeToast(toast.id)} />
      ))}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="font-heading font-bold text-3xl text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Personalized Itinerary
          </h1>
          <p className="text-muted-foreground">
            Tell us your budget, travel style, and interests — we&apos;ll build a full day-by-day plan.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="form-card space-y-6 mb-8">
          <h2 className="font-heading font-semibold text-xl text-foreground">Your preferences</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="form-label">Destination (optional)</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="form-input"
                placeholder="e.g. Kerala, India — or leave blank to let AI choose"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label">Nights</label>
              <select
                value={numberOfNights}
                onChange={(e) => setNumberOfNights(Number(e.target.value))}
                className="form-select"
              >
                {[2, 3, 4, 5, 7, 10, 14].map((n) => (
                  <option key={n} value={n}>
                    {n} nights
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="form-label flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                Budget min (USD)
              </label>
              <input
                type="number"
                min={0}
                required
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label">Budget max (USD)</label>
              <input
                type="number"
                min={0}
                required
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="form-label">Travel style</label>
            <select
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value)}
              className="form-select"
              required
            >
              {ITINERARY_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="form-label">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_SUGGESTIONS.map((item) => {
                const active = interests.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInterests((prev) => toggleInterest(prev, item))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustomInterest()
                  }
                }}
                className="form-input flex-1"
                placeholder="Add custom interest…"
              />
              <button type="button" onClick={addCustomInterest} className="button-secondary shrink-0">
                Add
              </button>
            </div>
            {interests.length > 0 ? (
              <p className="text-xs text-muted-foreground">Selected: {interests.join(", ")}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Generate itinerary
          </button>
        </form>

        {generated ? (
          <div className="space-y-6">
            {demo ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                Demo mode — add GEMINI_API_KEY or OPENAI_API_KEY in backend/.env for fully tailored AI plans.
              </p>
            ) : null}

            <div className="form-card space-y-4">
              <div>
                <h2 className="font-heading font-semibold text-2xl text-foreground">{generated.title}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    {generated.destination}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    {generated.numberOfNights} nights · {generated.totalDays || generated.days?.length} days
                  </span>
                  {generated.budget ? (
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-4 w-4 text-primary" />
                      {formatMoney(generated.budget.min, generated.budget.currency)} –{" "}
                      {formatMoney(generated.budget.max, generated.budget.currency)}
                    </span>
                  ) : null}
                </div>
              </div>

              {generated.description ? (
                <p className="text-muted-foreground leading-relaxed">{generated.description}</p>
              ) : null}

              {generated.highlights?.length ? (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Highlights</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {generated.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {(generated.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-full text-xs bg-secondary/10 text-secondary border border-secondary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-heading font-semibold text-xl text-foreground">Day-by-day plan</h3>
              {(generated.days || []).map((day) => (
                <div key={day.dayNumber} className="form-card space-y-3">
                  <h4 className="font-semibold text-lg text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Day {day.dayNumber}
                    {day.dayLabel ? <span className="font-normal text-muted-foreground">— {day.dayLabel}</span> : null}
                  </h4>
                  {day.hotel ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Hotel className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>
                        <strong className="text-foreground">{day.hotel.name}</strong> · {day.hotel.location}
                      </span>
                    </div>
                  ) : null}
                  <ul className="space-y-3">
                    {(day.activities || []).map((activity, idx) => (
                      <li key={idx} className="border-l-2 border-primary/30 pl-3">
                        <div className="flex items-start gap-2">
                          <Activity className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">
                              {activity.time} — {activity.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{activity.location}</p>
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save itinerary
              </button>
              <button
                type="button"
                onClick={() => navigate("/create", { state: { prefilled: generated } })}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-card font-semibold hover:bg-muted/50"
              >
                Edit manually
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
