import {
  listBookings,
  searchBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  listTripBookings,
  getTripTimeline,
  getUpcomingBookings,
  getBookingDashboard,
  convertBookingToExpense,
  getBookingsForAi,
  getMapMarkersFromBookings,
} from "../../services/bookings/bookingService.js"
import { notifyBookingEvent } from "../../services/notifications/notificationTriggers.js"
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js"
import { syncTripCalendarsForUser } from "../../services/calendar/calendarSyncService.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  res.status(status).json({ success: false, message: err.message || "Server error" })
}

/** GET /api/bookings */
export const getBookings = async (req, res) => {
  try {
    const data = await listBookings(req.user._id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/bookings/search */
export const searchBookingsHandler = async (req, res) => {
  try {
    const data = await searchBookings(req.user._id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/bookings/upcoming */
export const getUpcoming = async (req, res) => {
  try {
    const days = Number(req.query.days) || 14
    const items = await getUpcomingBookings(req.user._id, days)
    res.json({ success: true, data: { items } })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/bookings/dashboard */
export const getDashboard = async (req, res) => {
  try {
    const stats = await getBookingDashboard(req.user._id, req.query.tripId || null)
    res.json({ success: true, data: stats })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/bookings/ai-context */
export const getAiContext = async (req, res) => {
  try {
    const items = await getBookingsForAi(req.user._id, {
      tripId: req.query.tripId,
      query: req.query.q,
    })
    res.json({ success: true, data: { bookings: items } })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/bookings/:id */
export const getBooking = async (req, res) => {
  try {
    const data = await getBookingById(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/bookings */
export const postBooking = async (req, res) => {
  try {
    const data = await createBooking(req.user._id, req.body)
    notifyBookingEvent(req.user._id, data.tripId, NOTIFICATION_TYPES.BOOKING_CONFIRMED, {
      message: `${data.bookingType} booking saved${data.provider ? ` — ${data.provider}` : ""}.`,
      dedupKey: `booking-created-${data.id}`,
      actionUrl: `/bookings/${data.id}`,
    }).catch(() => {})
    syncTripCalendarsForUser(req.user._id, data.tripId).catch(() => {})
    res.status(201).json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** PUT /api/bookings/:id */
export const putBooking = async (req, res) => {
  try {
    const data = await updateBooking(req.user._id, req.params.id, req.body)
    notifyBookingEvent(req.user._id, data.tripId, NOTIFICATION_TYPES.BOOKING_UPDATED, {
      message: `Booking updated${data.provider ? ` — ${data.provider}` : ""}.`,
      dedupKey: `booking-updated-${data.id}-${Date.now()}`,
      actionUrl: `/bookings/${data.id}`,
    }).catch(() => {})
    syncTripCalendarsForUser(req.user._id, data.tripId).catch(() => {})
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** DELETE /api/bookings/:id */
export const removeBooking = async (req, res) => {
  try {
    const existing = await getBookingById(req.user._id, req.params.id)
    const data = await deleteBooking(req.user._id, req.params.id)
    notifyBookingEvent(req.user._id, existing.tripId, NOTIFICATION_TYPES.BOOKING_CANCELLED, {
      message: `Booking removed${existing.provider ? ` — ${existing.provider}` : ""}.`,
      dedupKey: `booking-deleted-${req.params.id}`,
    }).catch(() => {})
    syncTripCalendarsForUser(req.user._id, existing.tripId).catch(() => {})
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/bookings/:id/convert-expense */
export const convertToExpense = async (req, res) => {
  try {
    const data = await convertBookingToExpense(req.user._id, req.params.id)
    res.status(201).json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/trips/:id/bookings */
export const getTripBookings = async (req, res) => {
  try {
    const data = await listTripBookings(req.user._id, req.params.id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/trips/:id/bookings/timeline */
export const getTripBookingsTimeline = async (req, res) => {
  try {
    const data = await getTripTimeline(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/trips/:id/bookings/map-markers */
export const getTripBookingMarkers = async (req, res) => {
  try {
    const markers = await getMapMarkersFromBookings(req.user._id, req.params.id)
    res.json({ success: true, data: { markers } })
  } catch (err) {
    handleError(res, err)
  }
}
