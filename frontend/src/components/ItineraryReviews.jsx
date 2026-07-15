import { useCallback, useEffect, useState } from "react"
import { Loader2, MessageSquare } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { reviewAPI } from "../services/api"
import StarRating from "./StarRating"

const LOGIN_MESSAGE = "Please log in to leave a review"

function formatReviewDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function ItineraryReviews({ itineraryId, isAuthenticated }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState({ averageRating: 0, count: 0 })
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")

  const loadReviews = useCallback(async () => {
    if (!itineraryId) return
    setLoading(true)
    setError(null)
    try {
      const res = await reviewAPI.getForItinerary(itineraryId)
      const payload = res.data?.data
      setSummary(payload?.summary || { averageRating: 0, count: 0 })
      setReviews(payload?.reviews || [])
    } catch (err) {
      setError(err?.message || "Could not load reviews")
    } finally {
      setLoading(false)
    }
  }, [itineraryId])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: { pathname: `/itineraries/${itineraryId}`, search: "" },
          message: LOGIN_MESSAGE,
        },
      })
      return
    }
    if (rating < 1) {
      setError("Please select a star rating")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await reviewAPI.add(itineraryId, { rating, comment })
      const payload = res.data?.data
      if (payload?.summary) setSummary(payload.summary)
      await loadReviews()
      setComment("")
      if (payload?.review?.rating) setRating(payload.review.rating)
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not submit review")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading font-semibold text-xl text-card-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Reviews &amp; Ratings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">See what travelers think about this itinerary</p>
        </div>
        {summary.count > 0 ? (
          <div className="text-right">
            <StarRating value={summary.averageRating} readOnly size="md" showValue />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.count} review{summary.count === 1 ? "" : "s"}
            </p>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Your rating</p>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
        <div>
          <label htmlFor="review-comment" className="text-sm font-medium text-foreground block mb-2">
            Your review (optional)
          </label>
          <textarea
            id="review-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this trip plan…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            maxLength={2000}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || rating < 1}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isAuthenticated ? "Submit review" : "Log in to review"}
        </button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reviews…
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No reviews yet. Be the first to rate this itinerary.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review._id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="font-medium text-foreground">{review.user?.name || "Traveler"}</p>
                <time className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</time>
              </div>
              <StarRating value={review.rating} readOnly size="sm" />
              {review.comment ? (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
