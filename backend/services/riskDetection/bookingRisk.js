import { createRiskItem } from "../../utils/riskHelpers.js"

function toDate(val) {
  if (!val) return null
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? null : d
}

function hoursBetween(a, b) {
  return Math.abs(a - b) / (60 * 60 * 1000)
}

export function detectBookingRisks(bookings = [], trip = {}) {
  const risks = []
  const flights = bookings.filter((b) => b.bookingType === "flight")
  const hotels = bookings.filter((b) => b.bookingType === "hotel")
  const ground = bookings.filter((b) => ["taxi", "transfer", "car_rental"].includes(b.bookingType))

  for (const flight of flights) {
    const dep = toDate(flight.departureDate)
    const status = String(flight.status || "").toLowerCase()

    if (status.includes("cancel")) {
      risks.push(
        createRiskItem({
          riskType: "flight_cancellation",
          severity: "CRITICAL",
          title: "Flight cancelled",
          description: `${flight.provider || "Flight"} ${flight.bookingReference || ""} appears cancelled.`,
          source: "booking",
          recommendation: {
            title: "Rebook immediately",
            suggestions: [
              "Contact airline for alternate flights",
              "Notify hotel of late arrival",
              "Check travel insurance coverage",
            ],
          },
          metadata: { bookingId: String(flight._id) },
        }),
      )
    } else if (status.includes("delay")) {
      risks.push(
        createRiskItem({
          riskType: "flight_delay",
          severity: "HIGH",
          title: "Flight delay reported",
          description: `${flight.provider || "Flight"} may arrive late — downstream plans at risk.`,
          source: "booking",
          recommendation: {
            suggestions: [
              "Monitor gate and terminal updates",
              "Adjust hotel check-in or airport pickup",
              "Move first-day activities later",
            ],
          },
          metadata: { bookingId: String(flight._id) },
        }),
      )
    }

    if (dep && hotels.length) {
      for (const hotel of hotels) {
        const checkIn = toDate(hotel.checkIn)
        if (!checkIn) continue
        const gap = hoursBetween(dep, checkIn)
        if (gap < 1) {
          risks.push(
            createRiskItem({
              riskType: "hotel_checkin_conflict",
              severity: "HIGH",
              title: "Hotel check-in too close to arrival",
              description: `Flight lands near hotel check-in at ${hotel.provider || "hotel"} — buffer under 1 hour.`,
              source: "booking",
              recommendation: {
                title: "Request early check-in or lounge",
                suggestions: [
                  "Contact hotel for early check-in",
                  "Store luggage and explore nearby café",
                  "Book airport lounge if long wait",
                ],
              },
              metadata: { flightId: String(flight._id), hotelId: String(hotel._id) },
            }),
          )
        }
      }
    }
  }

  const hasFlight = flights.length > 0
  const hasGround = ground.length > 0
  if (hasFlight && !hasGround && (trip.days || []).length > 1) {
    risks.push(
      createRiskItem({
        riskType: "missing_transport",
        severity: "LOW",
        title: "No ground transport booked",
        description: "Flight is booked but no taxi or transfer found for airport pickup.",
        source: "booking",
        recommendation: {
          suggestions: [
            "Pre-book airport taxi or hotel shuttle",
            "Save offline maps for arrival terminal",
          ],
        },
      }),
    )
  }

  return risks
}

export function detectCalendarConflicts(events = []) {
  const risks = []
  const seen = new Map()

  for (const ev of events || []) {
    const key = `${ev.title}-${ev.start}`
    if (seen.has(key)) {
      risks.push(
        createRiskItem({
          riskType: "schedule_conflict",
          severity: "MEDIUM",
          title: "Duplicate calendar event",
          description: `"${ev.title}" appears more than once at the same time.`,
          source: "calendar",
          recommendation: {
            suggestions: ["Remove duplicate calendar entry", "Sync calendar after itinerary changes"],
          },
        }),
      )
    }
    seen.set(key, true)
  }

  return risks
}
