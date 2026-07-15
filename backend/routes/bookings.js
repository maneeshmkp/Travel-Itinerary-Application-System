import express from "express"
import { body, query, param } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { PERMISSIONS } from "../constants/rbac.js"
import { idempotencyMiddleware } from "../middlewares/idempotency.js"
import { BOOKING_TYPE_IDS } from "../constants/bookingTypes.js"
import { BOOKING_STATUS_IDS, PAYMENT_STATUS_IDS } from "../constants/bookingStatuses.js"
import {
  getBookings,
  searchBookingsHandler,
  getUpcoming,
  getDashboard,
  getAiContext,
  getBooking,
  postBooking,
  putBooking,
  removeBooking,
  convertToExpense,
  getTripBookings,
  getTripBookingsTimeline,
  getTripBookingMarkers,
} from "../controllers/booking/bookingController.js"

const router = express.Router()
router.use(protect)
router.use(requirePermission(PERMISSIONS.BOOKINGS_MANAGE))

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

const validateListQuery = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("bookingType").optional().isIn(BOOKING_TYPE_IDS),
  query("status").optional().isIn(BOOKING_STATUS_IDS),
  query("sort").optional().isIn(["newest", "oldest", "price", "departure", "arrival"]),
]

const validateBookingCreate = [
  body("tripId").isMongoId().withMessage("Valid tripId is required"),
  body("bookingType").isIn(BOOKING_TYPE_IDS).withMessage("Invalid booking type"),
  body("status").optional().isIn(BOOKING_STATUS_IDS),
  body("paymentStatus").optional().isIn(PAYMENT_STATUS_IDS),
  body("price").optional().isFloat({ min: 0 }),
  body("travelerNames").optional().isArray(),
  body("notes").optional().isString().isLength({ max: 5000 }),
]

const validateBookingUpdate = [
  body("bookingType").optional().isIn(BOOKING_TYPE_IDS),
  body("status").optional().isIn(BOOKING_STATUS_IDS),
  body("paymentStatus").optional().isIn(PAYMENT_STATUS_IDS),
  body("price").optional().isFloat({ min: 0 }),
  body("travelerNames").optional().isArray(),
  body("notes").optional().isString().isLength({ max: 5000 }),
]

router.get("/dashboard", validateListQuery, handleValidation, getDashboard)
router.get("/upcoming", validateListQuery, handleValidation, getUpcoming)
router.get("/search", validateListQuery, handleValidation, searchBookingsHandler)
router.get("/ai-context", handleValidation, getAiContext)
router.get("/", validateListQuery, handleValidation, getBookings)
router.get("/:id", param("id").isMongoId(), handleValidation, getBooking)
router.post("/", validateBookingCreate, handleValidation, idempotencyMiddleware, postBooking)
router.put("/:id", param("id").isMongoId(), validateBookingUpdate, handleValidation, idempotencyMiddleware, putBooking)
router.delete("/:id", param("id").isMongoId(), handleValidation, removeBooking)
router.post("/:id/convert-expense", param("id").isMongoId(), handleValidation, idempotencyMiddleware, convertToExpense)

export default router
