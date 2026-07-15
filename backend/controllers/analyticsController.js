import BookingClick from "../models/BookingClick.js"
import { sanitizeBookingUrl } from "../utils/bookingUrlValidator.js"

/**
 * POST /api/analytics/booking-click
 * Body: { booking_type, name?, destination?, bookingUrl?, bookingProvider? }
 */
export const logBookingClick = async (req, res, next) => {
  try {
    const bookingType = String(req.body.booking_type || req.body.bookingType || "")
      .trim()
      .toLowerCase()

    if (bookingType !== "flight" && bookingType !== "hotel") {
      return res.status(400).json({
        success: false,
        message: 'booking_type must be "flight" or "hotel"',
      })
    }

    const itemName = String(req.body.name || req.body.itemName || "").trim().slice(0, 300)
    const destination = String(req.body.destination || "").trim().slice(0, 300)
    const bookingProvider = String(req.body.bookingProvider || "").trim().slice(0, 120)
    const rawUrl = req.body.bookingUrl || req.body.booking_url || ""
    const bookingUrl = sanitizeBookingUrl(rawUrl) || ""

    const record = await BookingClick.create({
      bookingType,
      itemName,
      destination,
      bookingProvider,
      bookingUrl,
      clickedAt: new Date(),
    })

    console.info(
      `[analytics] booking-click ${bookingType} | ${itemName || "unknown"} | ${destination || "unknown"} | ${bookingProvider || "unknown"}`,
    )

    res.status(201).json({
      success: true,
      data: {
        id: record._id,
        booking_type: record.bookingType,
        name: record.itemName,
        destination: record.destination,
        bookingProvider: record.bookingProvider,
        timestamp: record.clickedAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}
