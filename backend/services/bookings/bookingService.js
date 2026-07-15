import Booking from "../../models/Booking.js"
import Itinerary from "../../models/Itinerary.js"
import { normalizeBookingType } from "../../constants/bookingTypes.js"
import { normalizeBookingStatus, normalizePaymentStatus } from "../../constants/bookingStatuses.js"
import { normalizeCurrency, DEFAULT_CURRENCY } from "../../constants/currencies.js"
import { createTripExpense } from "../expenseService.js"
import {
  serializeBooking,
  serializeBookingDetail,
  buildTimeline,
  buildSearchFilter,
  parseSort,
  dashboardFromBookings,
  sanitizeAttachments,
  bookingToExpenseCategory,
  bookingPrimaryDate,
  resolveAutoStatus,
} from "../../utils/bookingHelpers.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"

function throwStatus(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

async function assertTripAccess(userId, tripId) {
  const trip = await Itinerary.findById(tripId).select("ownerId title destination collaborators")
  if (!trip) throwStatus("Trip not found", 404)
  if (!canAccessTripData(trip, userId)) throwStatus("Not authorized for this trip", 403)
  return trip
}

async function assertBookingOwner(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, userId })
  if (!booking) throwStatus("Booking not found", 404)
  return booking
}

function parseBookingBody(body, trip) {
  if (!body.provider?.trim() && !body.bookingReference?.trim() && !body.confirmationNumber?.trim()) {
    throwStatus("Provider or booking reference is required")
  }

  const bookingType = normalizeBookingType(body.bookingType)
  const payload = {
    bookingType,
    provider: String(body.provider || "").trim().slice(0, 200),
    bookingReference: String(body.bookingReference || "").trim().slice(0, 120),
    confirmationNumber: String(body.confirmationNumber || "").trim().slice(0, 120),
    status: normalizeBookingStatus(body.status),
    departureDate: body.departureDate ? new Date(body.departureDate) : undefined,
    arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : undefined,
    checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
    checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
    eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
    price: Math.max(0, Number(body.price) || 0),
    currency: normalizeCurrency(body.currency, trip?.budget?.currency || DEFAULT_CURRENCY),
    paymentStatus: normalizePaymentStatus(body.paymentStatus),
    travelerNames: Array.isArray(body.travelerNames)
      ? body.travelerNames.map((n) => String(n).trim()).filter(Boolean).slice(0, 20)
      : [],
    seatNumber: String(body.seatNumber || "").trim().slice(0, 40),
    gate: String(body.gate || "").trim().slice(0, 20),
    terminal: String(body.terminal || "").trim().slice(0, 20),
    flightNumber: String(body.flightNumber || "").trim().toUpperCase().slice(0, 12),
    originCode: String(body.originCode || "").trim().toUpperCase().slice(0, 4),
    destinationCode: String(body.destinationCode || "").trim().toUpperCase().slice(0, 4),
    hotelAddress: String(body.hotelAddress || "").trim().slice(0, 500),
    phone: String(body.phone || "").trim().slice(0, 40),
    website: String(body.website || "").trim().slice(0, 500),
    email: String(body.email || "").trim().slice(0, 200),
    notes: String(body.notes || "").trim().slice(0, 5000),
    locationName: String(body.locationName || body.provider || "").trim().slice(0, 200),
  }

  const lat = Number(body.latitude)
  const lng = Number(body.longitude)
  if (Number.isFinite(lat) && lat >= -90 && lat <= 90) payload.latitude = lat
  if (Number.isFinite(lng) && lng >= -180 && lng <= 180) payload.longitude = lng

  if (body.attachments) payload.attachments = sanitizeAttachments(body.attachments)

  return payload
}

export async function listBookings(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const filter = buildSearchFilter(userId, query)
  const sort = parseSort(query.sort)

  const [rows, total] = await Promise.all([
    Booking.find(filter)
      .select("-attachments")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ])

  return {
    items: rows.map(serializeBooking),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  }
}

export async function searchBookings(userId, query = {}) {
  return listBookings(userId, { ...query, q: query.q || query.search })
}

export async function getBookingById(userId, bookingId) {
  const booking = await assertBookingOwner(userId, bookingId)
  return serializeBookingDetail(booking)
}

export async function createBooking(userId, body) {
  const tripId = body.tripId
  if (!tripId) throwStatus("tripId is required")
  const trip = await assertTripAccess(userId, tripId)

  const clientRequestId = body.clientRequestId || body.clientId || null
  if (clientRequestId) {
    const existing = await Booking.findOne({ userId, clientRequestId }).lean()
    if (existing) return serializeBookingDetail(existing)
  }

  const payload = parseBookingBody(body, trip)
  const booking = await Booking.create({
    userId,
    tripId,
    ...payload,
    ...(clientRequestId ? { clientRequestId } : {}),
  })

  try {
    const { logBooking } = await import("../../logger/index.js")
    const { recordDomainEvent } = await import("../monitoring/metricsStore.js")
    logBooking.info("Booking created", {
      bookingId: String(booking._id),
      type: booking.bookingType,
      status: booking.status,
    })
    recordDomainEvent("booking", true)
  } catch {
    /* monitoring optional */
  }

  if (booking.bookingType === "flight") {
    const { autoTrackFromBooking } = await import("../flightTracking/flightTrackingService.js")
    autoTrackFromBooking(userId, booking).catch((err) =>
      console.error("Auto flight tracking:", err.message),
    )
  }

  try {
    const { invalidateBookingCaches } = await import("../../utils/cacheHelpers.js")
    await invalidateBookingCaches(userId, tripId)
  } catch {
    /* redis optional */
  }

  const { publishAsync, DOMAIN_EVENTS } = await import("../../events/index.js")
  publishAsync(
    DOMAIN_EVENTS.BOOKING_CREATED,
    {
      userId: String(userId),
      tripId: String(tripId),
      id: String(booking._id),
      bookingType: booking.bookingType,
      status: booking.status,
      skipEventNotification: true,
    },
    { source: "bookingService.create", userId: String(userId), dedupeKey: `booking:create:${booking._id}` },
  )

  return serializeBookingDetail(booking)
}

export async function updateBooking(userId, bookingId, body) {
  const booking = await assertBookingOwner(userId, bookingId)
  const trip = await assertTripAccess(userId, booking.tripId)
  const payload = parseBookingBody({ ...serializeBooking(booking), ...body }, trip)

  Object.assign(booking, payload)
  await booking.save()
  try {
    const { invalidateBookingCaches, invalidateFlightCaches } = await import("../../utils/cacheHelpers.js")
    await invalidateBookingCaches(userId, booking.tripId)
    if (booking.bookingType === "flight") {
      await invalidateFlightCaches(booking.flightNumber, userId, booking.tripId)
    }
  } catch {
    /* redis optional */
  }

  if (String(booking.status).toLowerCase() === "cancelled") {
    const { publishAsync, DOMAIN_EVENTS } = await import("../../events/index.js")
    publishAsync(
      DOMAIN_EVENTS.BOOKING_CANCELLED,
      {
        userId: String(userId),
        tripId: String(booking.tripId),
        id: String(booking._id),
        bookingType: booking.bookingType,
        status: booking.status,
        skipEventNotification: true,
      },
      { source: "bookingService.update", userId: String(userId), dedupeKey: `booking:cancel:${booking._id}:${booking.updatedAt}` },
    )
  }

  return serializeBookingDetail(booking)
}

export async function deleteBooking(userId, bookingId) {
  const booking = await assertBookingOwner(userId, bookingId)
  const tripId = booking.tripId
  await booking.deleteOne()
  try {
    const { invalidateBookingCaches } = await import("../../utils/cacheHelpers.js")
    await invalidateBookingCaches(userId, tripId)
  } catch {
    /* redis optional */
  }
  return { id: String(bookingId) }
}

export async function listTripBookings(userId, tripId, query = {}) {
  await assertTripAccess(userId, tripId)
  return listBookings(userId, { ...query, tripId })
}

export async function getTripTimeline(userId, tripId) {
  await assertTripAccess(userId, tripId)
  const rows = await Booking.find({ userId, tripId }).lean()
  return buildTimeline(rows)
}

export async function getUpcomingBookings(userId, days = 14) {
  const now = new Date()
  const until = new Date(now)
  until.setDate(until.getDate() + Number(days))

  const rows = await Booking.find({
    userId,
    status: { $nin: ["cancelled", "completed"] },
    $or: [
      { departureDate: { $gte: now, $lte: until } },
      { checkIn: { $gte: now, $lte: until } },
      { eventDate: { $gte: now, $lte: until } },
    ],
  })
    .sort({ departureDate: 1, checkIn: 1, eventDate: 1 })
    .lean()

  return rows.map(serializeBooking)
}

export async function getBookingDashboard(userId, tripId = null) {
  const { withCache, RedisKeys, TTL } = await import("../../utils/cacheHelpers.js")
  return withCache(
    RedisKeys.tripDashboard(userId, tripId || "all"),
    TTL.TRIP_DASHBOARD,
    async () => {
      const filter = { userId }
      if (tripId) filter.tripId = tripId
      const rows = await Booking.find(filter).lean()
      return dashboardFromBookings(rows)
    },
  )
}

export async function convertBookingToExpense(userId, bookingId) {
  const booking = await assertBookingOwner(userId, bookingId)
  if (booking.expenseId) {
    throwStatus("Booking already linked to an expense", 409)
  }

  const trip = await assertTripAccess(userId, booking.tripId)
  const category = bookingToExpenseCategory(booking.bookingType)
  const description = [booking.provider, booking.bookingReference, booking.confirmationNumber]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 200)

  const expense = await createTripExpense(userId, booking.tripId, {
    amount: booking.price || 0,
    category,
    description: description || `${booking.bookingType} booking`,
    currency: booking.currency,
    paymentMethod: booking.paymentStatus === "paid" ? "card" : "other",
    notes: `Converted from booking ${booking._id}`,
    dayNumber: 1,
  })

  booking.expenseId = expense.id || expense._id
  await booking.save()

  return { booking: serializeBookingDetail(booking), expense }
}

export async function refreshStoredBookingStatuses(userId, tripId = null) {
  const filter = { userId }
  if (tripId) filter.tripId = tripId
  const rows = await Booking.find(filter)
  let updated = 0
  for (const b of rows) {
    const next = resolveAutoStatus(b)
    if (b.status !== next && b.status !== "cancelled" && b.status !== "pending") {
      b.status = next
      await b.save()
      updated += 1
    }
  }
  return { updated }
}

export async function getBookingsForAi(userId, { tripId, query } = {}) {
  const filter = buildSearchFilter(userId, { tripId, q: query })
  const rows = await Booking.find(filter).sort({ departureDate: 1, checkIn: 1 }).limit(30).lean()
  return rows.map((b) => {
    const s = serializeBooking(b)
    return {
      type: s.bookingType,
      provider: s.provider,
      reference: s.bookingReference || s.confirmationNumber,
      status: s.status,
      date: s.primaryDate,
      price: s.price,
      currency: s.currency,
      travelers: s.travelerNames,
      gate: s.gate,
      terminal: s.terminal,
      seat: s.seatNumber,
      address: s.hotelAddress || s.locationName,
    }
  })
}

export async function getMapMarkersFromBookings(userId, tripId) {
  const rows = await Booking.find({
    userId,
    tripId,
    latitude: { $exists: true },
    longitude: { $exists: true },
  }).lean()

  return rows
    .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
    .map((b) => ({
      id: String(b._id),
      lat: b.latitude,
      lng: b.longitude,
      title: b.locationName || b.provider,
      bookingType: b.bookingType,
      popupHtml: `<strong>${b.provider}</strong><br/>${b.bookingReference || b.confirmationNumber || ""}`,
    }))
}
