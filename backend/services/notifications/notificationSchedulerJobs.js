import Itinerary from "../../models/Itinerary.js"
import Booking from "../../models/Booking.js"
import { buildExpenseReport } from "../expenseService.js"
import { getWeatherForecast } from "../weatherService.js"
import {
  notifyActivityReminder,
  notifyFlightReminder,
  notifyHotelReminder,
  notifyWeatherAlert,
  notifyBudgetThresholdIfChanged,
  notifyAiReminder,
  notifyBookingReminder,
  tripRecipients,
} from "./notificationTriggers.js"
import { runDocumentExpiryReminders } from "../documentReminder.js"
import { runPackingReminders } from "../packing/packingReminderService.js"
import { runRiskAnalysisReminders } from "../risk/riskReminderService.js"
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js"
import { bookingPrimaryDate } from "../../utils/bookingHelpers.js"
import {
  combineDateAndTime,
  dayDateForTrip,
  isSameCalendarDay,
  isTomorrow,
  minutesBetween,
  parseTimeString,
} from "./notificationTimeUtils.js"

const ACTIVITY_REMINDER_MINUTES = 60
const FLIGHT_OFFSETS = [
  { type: NOTIFICATION_TYPES.FLIGHT_CHECKIN, hoursBefore: 24, title: "Check-in opens soon" },
  { type: NOTIFICATION_TYPES.FLIGHT_BOARDING, hoursBefore: 1, title: "Boarding starts soon" },
  { type: NOTIFICATION_TYPES.FLIGHT_GATE_CLOSE, minutesBefore: 30, title: "Gate closing soon" },
  { type: NOTIFICATION_TYPES.FLIGHT_DEPARTURE, minutesBefore: 120, title: "Flight departure reminder" },
]

async function loadActiveTrips() {
  return Itinerary.find({
    ownerId: { $exists: true, $ne: null },
  })
    .populate({
      path: "days",
      populate: { path: "activities", model: "Activity" },
    })
    .populate("ownerId", "name email")
    .lean()
}

export async function runActivityReminders(now = new Date()) {
  const trips = await loadActiveTrips()
  let count = 0

  for (const trip of trips) {
    const userId = trip.ownerId?._id || trip.ownerId
    if (!userId) continue

    for (const day of trip.days || []) {
      const dayDate = dayDateForTrip(trip, day.dayNumber)
      if (!dayDate || !isSameCalendarDay(dayDate, now)) continue

      for (const act of day.activities || []) {
        if (!act || act.skipped) continue
        const at = combineDateAndTime(dayDate, act.time)
        if (!at) continue
        const mins = minutesBetween(now, at)
        if (mins > 0 && mins <= ACTIVITY_REMINDER_MINUTES) {
          const n = await notifyActivityReminder(
            userId,
            trip,
            { ...act, dayNumber: day.dayNumber, scheduledAt: at.toISOString() },
            mins,
          )
          if (n) count += 1
        }
      }
    }
  }
  return count
}

export async function runHotelReminders(now = new Date()) {
  const trips = await loadActiveTrips()
  let count = 0

  for (const trip of trips) {
    const userId = trip.ownerId?._id || trip.ownerId
    if (!userId) continue

    for (const day of trip.days || []) {
      const dayDate = dayDateForTrip(trip, day.dayNumber)
      if (!dayDate) continue
      const hotel = day.hotel
      if (!hotel?.name) continue

      if (isSameCalendarDay(dayDate, now)) {
        const n = await notifyHotelReminder(
          userId,
          trip,
          NOTIFICATION_TYPES.HOTEL_CHECKIN,
          {
            title: "Hotel check-in today",
            body: `Check in at ${hotel.name} today${hotel.checkIn ? ` (${hotel.checkIn})` : ""}.`,
            eventDate: dayDate.toLocaleDateString(),
          },
          `hotel-checkin-${trip._id}-day${day.dayNumber}`,
        )
        if (n) count += 1
      }

      const checkoutDate = dayDateForTrip(trip, day.dayNumber + 1)
      if (checkoutDate && isTomorrow(now, checkoutDate)) {
        const n = await notifyHotelReminder(
          userId,
          trip,
          NOTIFICATION_TYPES.HOTEL_CHECKOUT,
          {
            title: "Hotel check-out tomorrow",
            body: `Check out from ${hotel.name} tomorrow${hotel.checkOut ? ` (${hotel.checkOut})` : ""}.`,
            eventDate: checkoutDate.toLocaleDateString(),
          },
          `hotel-checkout-${trip._id}-day${day.dayNumber}`,
        )
        if (n) count += 1
      }
    }
  }
  return count
}

export async function runFlightReminders(now = new Date()) {
  const trips = await loadActiveTrips()
  let count = 0

  for (const trip of trips) {
    const userId = trip.ownerId?._id || trip.ownerId
    if (!userId) continue

    for (const day of trip.days || []) {
      const dayDate = dayDateForTrip(trip, day.dayNumber)
      if (!dayDate) continue

      for (const transfer of day.transfers || []) {
        if (transfer.mode !== "flight" && transfer.type !== "airport") continue
        const dep = combineDateAndTime(dayDate, transfer.time)
        if (!dep) continue

        for (const rule of FLIGHT_OFFSETS) {
          let triggerAt
          if (rule.hoursBefore) {
            triggerAt = new Date(dep.getTime() - rule.hoursBefore * 60 * 60 * 1000)
          } else {
            triggerAt = new Date(dep.getTime() - (rule.minutesBefore || 0) * 60 * 1000)
          }
          const mins = minutesBetween(now, triggerAt)
          if (mins >= 0 && mins < 15) {
            const n = await notifyFlightReminder(
              userId,
              trip,
              rule.type,
              {
                title: rule.title,
                body: `Flight ${transfer.from} → ${transfer.to} on ${dep.toLocaleString()}.`,
                eventDate: dep.toLocaleString(),
              },
              `flight-${rule.type}-${trip._id}-${day.dayNumber}-${transfer.from}`,
            )
            if (n) count += 1
          }
        }
      }
    }
  }
  return count
}

const SEVERE_CONDITIONS = [
  { match: /thunder|storm|tornado|hurricane/i, label: "Storm", suggestion: "Consider indoor activities or rescheduling outdoor plans." },
  { match: /heavy rain|extreme rain|downpour/i, label: "Heavy rain", suggestion: "Pack rain gear and adjust outdoor activities." },
  { match: /snow|blizzard|freezing/i, label: "Snow", suggestion: "Check road conditions and dress warmly." },
  { match: /extreme heat|heat wave/i, label: "Extreme heat", suggestion: "Stay hydrated and avoid midday sun." },
]

export async function runWeatherAlerts(now = new Date()) {
  const trips = await loadActiveTrips()
  let count = 0
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  for (const trip of trips) {
    const userId = trip.ownerId?._id || trip.ownerId
    if (!userId || !trip.destination) continue

    try {
      const forecast = await getWeatherForecast(trip.destination, 3, tomorrowStr)
      const days = forecast?.days || forecast?.forecast || []
      const target = Array.isArray(days) ? days[0] : null
      const condition = String(target?.condition || target?.description || target?.main || "")

      for (const rule of SEVERE_CONDITIONS) {
        if (rule.match.test(condition)) {
          const n = await notifyWeatherAlert(userId, trip, {
            title: `Weather alert: ${rule.label}`,
            message: `${rule.label} expected near ${trip.destination} tomorrow. ${rule.suggestion}`,
            dedupKey: `weather-${trip._id}-${tomorrowStr}-${rule.label}`,
            condition,
            suggestion: rule.suggestion,
          })
          if (n) count += 1
          break
        }
      }
    } catch {
      // skip when weather API unavailable
    }
  }
  return count
}

export async function runBudgetChecks() {
  const trips = await loadActiveTrips()
  let count = 0

  for (const trip of trips) {
    const userId = trip.ownerId?._id || trip.ownerId
    if (!userId) continue
    try {
      const report = await buildExpenseReport(userId, trip._id)
      if (!report?.budget?.warningLevel) continue
      const n = await notifyBudgetThresholdIfChanged(
        userId,
        trip._id,
        null,
        report.budget.warningLevel,
      )
      if (n) count += 1
    } catch {
      // skip
    }
  }
  return count
}

export async function runAiReminders(now = new Date()) {
  const trips = await loadActiveTrips()
  let count = 0
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  for (const trip of trips) {
    const userId = trip.ownerId?._id || trip.ownerId
    if (!userId) continue

    try {
      const forecast = await getWeatherForecast(trip.destination, 2, tomorrow.toISOString().slice(0, 10))
      const days = forecast?.days || forecast?.forecast || []
      const tomorrowWx = Array.isArray(days) ? days[0] : null
      const condition = String(tomorrowWx?.condition || tomorrowWx?.description || "")

      if (/heavy rain|storm|thunder/i.test(condition)) {
        const n = await notifyAiReminder(userId, trip, {
          title: "AI insight: Weather tomorrow",
          message: `Heavy rain is forecast for ${trip.destination} tomorrow. Consider moving outdoor activities to another day.`,
          dedupKey: `ai-weather-${trip._id}-${tomorrow.toISOString().slice(0, 10)}`,
        })
        if (n) count += 1
      }

      for (const day of trip.days || []) {
        const dayDate = dayDateForTrip(trip, day.dayNumber)
        if (!dayDate || !isTomorrow(now, dayDate)) continue
        for (const act of day.activities || []) {
          if (!act?.name) continue
          if (/museum|gallery|monument/i.test(act.name) && /rain|storm/i.test(condition)) {
            const n = await notifyAiReminder(userId, trip, {
              title: "AI insight: Plan adjustment",
              message: `Rain tomorrow may affect outdoor plans. ${act.name} is a good indoor alternative.`,
              dedupKey: `ai-indoor-${trip._id}-${act._id}-${tomorrow.toISOString().slice(0, 10)}`,
            })
            if (n) count += 1
          }
        }
      }
    } catch {
      // skip
    }
  }
  return count
}

export async function runBookingReminders(now = new Date()) {
  const bookings = await Booking.find({
    status: { $nin: ["cancelled", "completed"] },
  })
    .populate("tripId", "title destination")
    .lean()

  let count = 0
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  for (const b of bookings) {
    const userId = b.userId
    const trip = b.tripId
    if (!userId || !trip) continue

    const primary = bookingPrimaryDate(b)
    if (!primary) continue
    const eventAt = new Date(primary)
    const tripTitle = trip.title || "your trip"
    const actionUrl = `/bookings/${b._id}`

    if (b.bookingType === "flight" && eventAt >= now && eventAt <= in24h) {
      const n = await notifyBookingReminder(userId, trip._id, {
        type: NOTIFICATION_TYPES.FLIGHT_DEPARTURE,
        title: "Flight in 24 hours",
        message: `${b.provider || "Your flight"} ${b.bookingReference || ""} departs within 24 hours.`,
        dedupKey: `booking-flight-24h-${b._id}`,
        tripTitle,
        bookingId: String(b._id),
        bookingType: b.bookingType,
        actionUrl,
        sendEmail: true,
      })
      if (n) count += 1
    }

    if (b.bookingType === "hotel" && b.checkIn && isTomorrow(new Date(b.checkIn), now)) {
      const n = await notifyBookingReminder(userId, trip._id, {
        type: NOTIFICATION_TYPES.HOTEL_CHECKIN,
        title: "Hotel check-in tomorrow",
        message: `Check in at ${b.provider || "your hotel"} tomorrow.`,
        dedupKey: `booking-hotel-checkin-${b._id}-${new Date(b.checkIn).toISOString().slice(0, 10)}`,
        tripTitle,
        bookingId: String(b._id),
        bookingType: b.bookingType,
        actionUrl,
        sendEmail: true,
      })
      if (n) count += 1
    }

    if (b.bookingType === "restaurant" && isSameCalendarDay(eventAt, now)) {
      const n = await notifyBookingReminder(userId, trip._id, {
        type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
        title: "Restaurant reservation today",
        message: `Reservation at ${b.provider || "restaurant"} is today.`,
        dedupKey: `booking-restaurant-today-${b._id}`,
        tripTitle,
        bookingId: String(b._id),
        bookingType: b.bookingType,
        actionUrl,
      })
      if (n) count += 1
    }

    if (b.gate && b.bookingType === "flight" && eventAt >= now && minutesBetween(now, eventAt) <= 90) {
      const n = await notifyBookingReminder(userId, trip._id, {
        type: NOTIFICATION_TYPES.FLIGHT_BOARDING,
        title: "Boarding starts soon",
        message: `Boarding for ${b.provider || "your flight"} — Gate ${b.gate}${b.terminal ? `, Terminal ${b.terminal}` : ""}.`,
        dedupKey: `booking-boarding-${b._id}`,
        tripTitle,
        bookingId: String(b._id),
        bookingType: b.bookingType,
        actionUrl,
        sendEmail: true,
      })
      if (n) count += 1
    }
  }
  return count
}

export async function runAllScheduledChecks() {
  const now = new Date()
  const results = {
    activities: await runActivityReminders(now),
    hotels: await runHotelReminders(now),
    flights: await runFlightReminders(now),
    bookings: await runBookingReminders(now),
    documents: await runDocumentExpiryReminders(now),
    packing: await runPackingReminders(now),
    risks: await runRiskAnalysisReminders(now),
    weather: await runWeatherAlerts(now),
    budget: await runBudgetChecks(),
    ai: await runAiReminders(now),
    ranAt: now.toISOString(),
  }
  return results
}
