import crypto from "crypto"
import { combineDateAndTime, dayDateForTrip } from "../services/notifications/notificationTimeUtils.js"
import { bookingPrimaryDate } from "./bookingHelpers.js"

function parseDurationHours(duration) {
  const s = String(duration || "")
  const m = s.match(/(\d+(?:\.\d+)?)\s*h/i) || s.match(/(\d+)/)
  const n = m ? Number(m[1]) : 2
  return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 2
}

function addHours(date, hours) {
  const d = new Date(date)
  d.setTime(d.getTime() + hours * 3600000)
  return d
}

function eventHash(ev) {
  const payload = `${ev.title}|${ev.start?.toISOString()}|${ev.end?.toISOString()}|${ev.location}|${ev.description}`
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 24)
}

export function buildActivityEvent(itinerary, day, activity) {
  if (!activity || activity.skipped) return null
  const dayDate = dayDateForTrip(itinerary, day.dayNumber)
  if (!dayDate) return null

  const start = combineDateAndTime(dayDate, activity.time) || new Date(dayDate.setHours(9, 0, 0, 0))
  const end = addHours(start, parseDurationHours(activity.duration))

  const tripName = itinerary.title || "Trip"
  const uid = `travelplan-${itinerary._id}-activity-${activity._id}`

  return {
    uid,
    sourceType: "activity",
    sourceId: String(activity._id),
    title: `${activity.name} — ${tripName}`,
    description: [
      activity.description,
      `Trip: ${tripName}`,
      `Destination: ${itinerary.destination}`,
      activity.cost ? `Est. cost: ${activity.cost}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    location: activity.location || activity.geocodedName || itinerary.destination,
    latitude: activity.latitude,
    longitude: activity.longitude,
    start,
    end,
    tripName,
    notes: `Day ${day.dayNumber} activity`,
    syncHash: "",
  }
}

export function buildBookingEvent(itinerary, booking) {
  const primary = bookingPrimaryDate(booking)
  if (!primary) return null

  const start = new Date(primary)
  let end = new Date(start)
  if (booking.bookingType === "hotel" && booking.checkOut) {
    end = new Date(booking.checkOut)
  } else if (booking.arrivalDate) {
    end = new Date(booking.arrivalDate)
  } else {
    end = addHours(start, booking.bookingType === "restaurant" ? 2 : 3)
  }

  const tripName = itinerary.title || "Trip"
  const uid = `travelplan-${itinerary._id}-booking-${booking._id || booking.id}`

  const titleMap = {
    flight: "✈️ Flight",
    hotel: "🏨 Hotel",
    train: "🚆 Train",
    bus: "🚌 Bus",
    taxi: "🚕 Taxi",
    restaurant: "🍽️ Reservation",
    activity: "🎯 Activity",
  }

  return {
    uid,
    sourceType: "booking",
    sourceId: String(booking._id || booking.id),
    title: `${titleMap[booking.bookingType] || "Booking"}: ${booking.provider} — ${tripName}`,
    description: [
      booking.notes,
      booking.bookingReference ? `Ref: ${booking.bookingReference}` : "",
      booking.confirmationNumber ? `Confirmation: ${booking.confirmationNumber}` : "",
      booking.travelerNames?.length ? `Travelers: ${booking.travelerNames.join(", ")}` : "",
      `Trip: ${tripName}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: booking.hotelAddress || booking.locationName || booking.provider,
    latitude: booking.latitude,
    longitude: booking.longitude,
    start,
    end,
    tripName,
    notes: booking.bookingType,
    syncHash: "",
  }
}

export function buildTripCalendarEvents(itinerary, bookings = []) {
  const events = []

  for (const day of itinerary.days || []) {
    for (const act of day.activities || []) {
      const ev = buildActivityEvent(itinerary, day, act)
      if (ev) {
        ev.syncHash = eventHash(ev)
        events.push(ev)
      }
    }
  }

  for (const b of bookings) {
    const ev = buildBookingEvent(itinerary, b)
    if (ev) {
      ev.syncHash = eventHash(ev)
      events.push(ev)
    }
  }

  return events.sort((a, b) => a.start - b.start)
}

export function detectConflicts(events) {
  const conflicts = []
  const sorted = [...events].sort((a, b) => a.start - b.start)

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]
      const b = sorted[j]
      if (b.start >= a.end) break
      if (a.start < b.end && b.start < a.end) {
        conflicts.push({
          type: "overlap",
          message: `"${a.title}" overlaps with "${b.title}"`,
          eventA: a.uid,
          eventB: b.uid,
          start: a.start,
          end: b.end,
        })
      }
    }
  }

  const seen = new Map()
  for (const ev of events) {
    const key = `${ev.title}|${ev.start?.toISOString()?.slice(0, 16)}`
    if (seen.has(key)) {
      conflicts.push({
        type: "duplicate",
        message: `Duplicate event: ${ev.title}`,
        eventA: seen.get(key),
        eventB: ev.uid,
      })
    } else {
      seen.set(key, ev.uid)
    }
  }

  return conflicts
}

export function mapIcsEventToInternal(vevent, tripId, userId) {
  const uid = vevent.uid || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const start = vevent.start ? new Date(vevent.start) : new Date()
  const end = vevent.end ? new Date(vevent.end) : addHours(start, 1)

  return {
    uid: `travelplan-${tripId}-imported-${uid}`,
    sourceType: "imported",
    sourceId: uid,
    title: vevent.summary || "Imported event",
    description: vevent.description || "",
    location: vevent.location || "",
    start,
    end,
    tripName: "",
    notes: "Imported from calendar",
    syncHash: eventHash({ title: vevent.summary, start, end, location: vevent.location, description: vevent.description }),
  }
}
