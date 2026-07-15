import { randomUUID } from "crypto"
import { normalizeBookingType } from "../constants/bookingTypes.js"
import { normalizeBookingStatus } from "../constants/bookingStatuses.js"
import { normalizeExpenseCategory } from "../constants/expenseCategories.js"

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024

export function bookingPrimaryDate(booking) {
  if (!booking) return null
  const type = booking.bookingType
  if (type === "hotel") return booking.checkIn || booking.checkOut || booking.eventDate
  if (type === "restaurant") return booking.eventDate || booking.departureDate
  return (
    booking.departureDate ||
    booking.eventDate ||
    booking.checkIn ||
    booking.arrivalDate ||
    booking.checkOut ||
    booking.createdAt
  )
}

export function resolveAutoStatus(booking, now = new Date()) {
  const current = normalizeBookingStatus(booking.status, "confirmed")
  if (current === "cancelled" || current === "pending") return current

  const primary = bookingPrimaryDate(booking)
  if (!primary) return current === "upcoming" ? "upcoming" : "confirmed"

  const end =
    booking.bookingType === "hotel"
      ? booking.checkOut || booking.checkIn
      : booking.arrivalDate || booking.departureDate || booking.eventDate || primary

  const endDate = end ? new Date(end) : new Date(primary)
  if (endDate < now) return "completed"
  if (primary > now) return "upcoming"
  return "confirmed"
}

export function serializeBooking(doc) {
  const b = doc?.toObject ? doc.toObject() : doc
  const status = resolveAutoStatus(b)
  return {
    id: String(b._id),
    userId: String(b.userId),
    tripId: String(b.tripId),
    bookingType: b.bookingType,
    provider: b.provider || "",
    bookingReference: b.bookingReference || "",
    confirmationNumber: b.confirmationNumber || "",
    status,
    storedStatus: b.status,
    departureDate: b.departureDate || null,
    arrivalDate: b.arrivalDate || null,
    checkIn: b.checkIn || null,
    checkOut: b.checkOut || null,
    eventDate: b.eventDate || null,
    primaryDate: bookingPrimaryDate(b),
    price: Number(b.price) || 0,
    currency: b.currency || "USD",
    paymentStatus: b.paymentStatus || "pending",
    travelerNames: b.travelerNames || [],
    seatNumber: b.seatNumber || "",
    gate: b.gate || "",
    terminal: b.terminal || "",
    flightNumber: b.flightNumber || "",
    originCode: b.originCode || "",
    destinationCode: b.destinationCode || "",
    hotelAddress: b.hotelAddress || "",
    phone: b.phone || "",
    website: b.website || "",
    email: b.email || "",
    notes: b.notes || "",
    latitude: b.latitude,
    longitude: b.longitude,
    locationName: b.locationName || "",
    attachments: (b.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
      category: a.category,
      hasData: Boolean(a.dataUrl),
      uploadedAt: a.uploadedAt,
    })),
    attachmentCount: (b.attachments || []).length,
    expenseId: b.expenseId ? String(b.expenseId) : null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }
}

export function serializeBookingDetail(doc) {
  const base = serializeBooking(doc)
  const b = doc?.toObject ? doc.toObject() : doc
  return {
    ...base,
    attachments: (b.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
      category: a.category,
      dataUrl: a.dataUrl || "",
      uploadedAt: a.uploadedAt,
    })),
  }
}

export function buildTimeline(bookings) {
  const items = bookings
    .map((b) => {
      const serialized = serializeBooking(b)
      return {
        ...serialized,
        sortAt: new Date(serialized.primaryDate || serialized.createdAt).getTime(),
      }
    })
    .filter((b) => Number.isFinite(b.sortAt))
    .sort((a, b) => a.sortAt - b.sortAt)

  const byDate = new Map()
  for (const item of items) {
    const d = new Date(item.primaryDate || item.createdAt)
    const key = d.toISOString().slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key).push(item)
  }

  return {
    items,
    byDate: Object.fromEntries(
      [...byDate.entries()].map(([date, list]) => [date, list.sort((a, b) => a.sortAt - b.sortAt)]),
    ),
  }
}

export function bookingToExpenseCategory(bookingType) {
  const map = {
    flight: "transport",
    train: "transport",
    bus: "transport",
    taxi: "transport",
    rental_car: "transport",
    cruise: "transport",
    hotel: "hotel",
    activity: "activity",
    restaurant: "food",
    insurance: "insurance",
    visa: "insurance",
    other: "misc",
  }
  return normalizeExpenseCategory(map[normalizeBookingType(bookingType)] || "misc")
}

export function sanitizeAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return []
  return attachments
    .slice(0, 10)
    .map((a) => {
      const dataUrl = String(a.dataUrl || "").trim()
      const size = Number(a.size) || (dataUrl ? dataUrl.length : 0)
      if (size > MAX_ATTACHMENT_BYTES) return null
      return {
        id: String(a.id || randomUUID()),
        name: String(a.name || "document").slice(0, 255),
        mimeType: String(a.mimeType || "application/octet-stream").slice(0, 120),
        size,
        category: String(a.category || "other").slice(0, 40),
        dataUrl: dataUrl.slice(0, MAX_ATTACHMENT_BYTES),
        uploadedAt: a.uploadedAt ? new Date(a.uploadedAt) : new Date(),
      }
    })
    .filter(Boolean)
}

export function parseSort(sort = "newest") {
  switch (String(sort).toLowerCase()) {
    case "oldest":
      return { createdAt: 1 }
    case "price":
      return { price: -1 }
    case "departure":
      return { departureDate: 1, checkIn: 1, eventDate: 1 }
    case "arrival":
      return { arrivalDate: 1, checkOut: 1 }
    default:
      return { createdAt: -1 }
  }
}

export function buildSearchFilter(userId, { q, bookingType, status, tripId, from, to, upcoming } = {}) {
  const filter = { userId }
  if (tripId) filter.tripId = tripId
  if (bookingType) filter.bookingType = bookingType

  if (status) {
    if (status === "upcoming") {
      filter.status = { $in: ["upcoming", "confirmed"] }
      filter.$or = [
        { departureDate: { $gte: new Date() } },
        { checkIn: { $gte: new Date() } },
        { eventDate: { $gte: new Date() } },
      ]
    } else {
      filter.status = status
    }
  }

  if (upcoming === "true" || upcoming === true) {
    const now = new Date()
    filter.status = { $nin: ["cancelled", "completed"] }
    filter.$or = [
      { departureDate: { $gte: now } },
      { checkIn: { $gte: now } },
      { eventDate: { $gte: now } },
    ]
  }

  if (from || to) {
    const dateFilter = {}
    if (from) dateFilter.$gte = new Date(from)
    if (to) dateFilter.$lte = new Date(to)
    filter.$and = filter.$and || []
    filter.$and.push({
      $or: [{ departureDate: dateFilter }, { checkIn: dateFilter }, { eventDate: dateFilter }],
    })
  }

  if (q?.trim()) {
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    filter.$and = filter.$and || []
    filter.$and.push({
      $or: [
        { bookingReference: regex },
        { confirmationNumber: regex },
        { provider: regex },
        { hotelAddress: regex },
        { locationName: regex },
        { notes: regex },
        { travelerNames: regex },
      ],
    })
  }

  return filter
}

export function dashboardFromBookings(bookings, now = new Date()) {
  const weekAhead = new Date(now)
  weekAhead.setDate(weekAhead.getDate() + 7)

  let upcoming = 0
  let completed = 0
  let cancelled = 0
  let pending = 0
  let totalCost = 0
  let upcomingThisWeek = 0

  for (const raw of bookings) {
    const b = serializeBooking(raw)
    const st = b.status
    if (st === "completed") completed += 1
    else if (st === "cancelled") cancelled += 1
    else if (st === "pending") pending += 1
    else upcoming += 1

    if (b.paymentStatus === "paid" || b.price > 0) totalCost += b.price

    const primary = b.primaryDate ? new Date(b.primaryDate) : null
    if (primary && primary >= now && primary <= weekAhead && st !== "cancelled" && st !== "completed") {
      upcomingThisWeek += 1
    }
  }

  return { upcoming, completed, cancelled, pending, totalCost, upcomingThisWeek, total: bookings.length }
}
