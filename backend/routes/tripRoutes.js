import express from "express"
import { param } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { PERMISSIONS } from "../constants/rbac.js"
import {
  getTripBookings,
  getTripBookingsTimeline,
  getTripBookingMarkers,
} from "../controllers/booking/bookingController.js"
import { getTripDocuments } from "../controllers/document/documentController.js"

const router = express.Router()
router.use(protect)
router.use(requirePermission(PERMISSIONS.TRIPS_MANAGE, PERMISSIONS.BOOKINGS_MANAGE, PERMISSIONS.DOCUMENTS_UPLOAD))

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

router.get("/:id/bookings/timeline", param("id").isMongoId(), handleValidation, getTripBookingsTimeline)
router.get("/:id/bookings/map-markers", param("id").isMongoId(), handleValidation, getTripBookingMarkers)
router.get("/:id/bookings", param("id").isMongoId(), handleValidation, getTripBookings)
router.get("/:id/documents", param("id").isMongoId(), handleValidation, getTripDocuments)

export default router
