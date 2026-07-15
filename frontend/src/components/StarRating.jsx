import { Star } from "lucide-react"

/**
 * @param {{
 *   value: number
 *   onChange?: (rating: number) => void
 *   readOnly?: boolean
 *   size?: "sm" | "md" | "lg"
 *   showValue?: boolean
 * }} props
 */
export default function StarRating({ value = 0, onChange, readOnly = false, size = "md", showValue = false }) {
  const interactive = !readOnly && typeof onChange === "function"
  const starClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"

  const display = Math.max(0, Math.min(5, Number(value) || 0))

  return (
    <div className="inline-flex items-center gap-1" role={interactive ? "radiogroup" : "img"} aria-label={`${display} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(display)
        const buttonClass = interactive
          ? "p-0.5 rounded hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          : ""

        const icon = (
          <Star
            className={`${starClass} ${
              filled ? "text-amber-500 fill-amber-500" : "text-muted-foreground/40"
            }`}
            aria-hidden
          />
        )

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              className={buttonClass}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            >
              {icon}
            </button>
          )
        }

        return (
          <span key={star} className="inline-flex">
            {icon}
          </span>
        )
      })}
      {showValue ? (
        <span className="ml-1.5 text-sm font-medium text-foreground tabular-nums">{display.toFixed(1)}</span>
      ) : null}
    </div>
  )
}
