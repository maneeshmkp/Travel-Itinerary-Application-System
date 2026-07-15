import { useCallback, useRef, useState } from "react"
import { analyticsAPI } from "../services/api"

const DEDUPE_MS = 3000

/**
 * Logs booking clicks and shows redirect status.
 * Navigation is handled by <a target="_blank"> so popups are not blocked.
 */
export function useBookingRedirect(destination = "") {
  const [redirectMessage, setRedirectMessage] = useState(null)
  const recentClicks = useRef(new Map())

  const shouldLogClick = useCallback((key) => {
    const now = Date.now()
    const last = recentClicks.current.get(key) || 0
    if (now - last < DEDUPE_MS) return false
    recentClicks.current.set(key, now)
    return true
  }, [])

  const logBookingClick = useCallback(
    ({ bookingType, item, fallbackProvider, intent = "book" }) => {
      const url = item?.bookingUrl
      if (!url) return false

      const provider = item?.bookingProvider || fallbackProvider
      const itemKey = `${bookingType}:${item.id || item.name}`
      const name =
        bookingType === "flight"
          ? item.airline
          : bookingType === "train"
            ? item.trainName || item.operator
            : bookingType === "bus"
              ? item.operator
              : item.name

      if (intent === "book") {
        const provider = item?.bookingProvider || fallbackProvider
        const labels = {
          flight: `Redirecting to ${provider || "Google Flights"}...`,
          hotel: `Redirecting to ${provider || "Google Hotels"}...`,
          train: `Redirecting to ${provider || "Google Maps Transit"}...`,
          bus: `Redirecting to ${provider || "RedBus"}...`,
        }
        setRedirectMessage(labels[bookingType] || `Redirecting to ${provider}...`)
        setTimeout(() => setRedirectMessage(null), 2500)
      }

      if (intent !== "book" || !shouldLogClick(itemKey)) {
        return true
      }

      void analyticsAPI
        .logBookingClick({
          booking_type: bookingType,
          name,
          destination: destination || item.destination || "",
          bookingUrl: url,
          bookingProvider: provider,
        })
        .catch(() => {})

      return true
    },
    [destination, shouldLogClick],
  )

  const logPartnerClick = useCallback(
    ({ bookingType, item, partner }) => {
      if (!partner?.url) return false

      const provider = partner.provider || partner.label
      const itemKey = `${bookingType}:${item?.id || item?.name}:${partner.id}`
      const name =
        bookingType === "train"
          ? item?.trainName || item?.operator
          : bookingType === "bus"
            ? item?.busType || item?.operator
            : item?.name

      setRedirectMessage(`Opening ${provider}...`)
      setTimeout(() => setRedirectMessage(null), 2500)

      if (!shouldLogClick(itemKey)) return true

      void analyticsAPI
        .logBookingClick({
          booking_type: bookingType,
          name,
          destination: destination || item?.destination || "",
          bookingUrl: partner.url,
          bookingProvider: provider,
        })
        .catch(() => {})

      return true
    },
    [destination, shouldLogClick],
  )

  return { redirectMessage, logBookingClick, logPartnerClick }
}
