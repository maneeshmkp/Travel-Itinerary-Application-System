import express from "express"
import { body } from "express-validator"
import {
  getItineraries,
  getItinerary,
  createItinerary,
  updateItinerary,
  deleteItinerary,
  getSearchSuggestions,
  saveItinerary,
  unsaveItineraryForUser,
  checkItinerarySaved,
  getSavedItineraries,
  refreshItineraryCoverImage,
  exportItineraryPdf,
  optimizeItinerary,
  adjustActivitySchedule,
  enableCollaboration,
  joinCollaboration,
} from "../controllers/itineraryController.js"
import { getItineraryReviews, addItineraryReview } from "../controllers/reviewController.js"
import {
  getItineraryExpenses,
  addItineraryExpense,
  updateItineraryExpense,
  removeItineraryExpense,
  duplicateItineraryExpense,
  exportItineraryExpensesCsv,
  exportItineraryExpensesPdf,
} from "../controllers/expenseController.js"
import { protect, optionalProtect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { requirePlanLimit } from "../middlewares/tenant.js"
import { PERMISSIONS } from "../constants/rbac.js"
import { idempotencyMiddleware } from "../middlewares/idempotency.js"

const router = express.Router()
const canTrips = requirePermission(PERMISSIONS.TRIPS_CREATE, PERMISSIONS.TRIPS_MANAGE)
const canExpenses = requirePermission(PERMISSIONS.EXPENSES_MANAGE)

/** Plan limit only when authenticated (optionalProtect create allowed for guests). */
function enforceTripLimit(req, res, next) {
  if (!req.user) return next()
  return requirePlanLimit("trips")(req, res, next)
}

// Validation middleware for creating itinerary
const validateItinerary = [
  body("title").notEmpty().withMessage("Title is required").trim(),
  body("destination").notEmpty().withMessage("Destination is required").trim(),
  body("numberOfNights").isInt({ min: 1, max: 30 }).withMessage("Number of nights must be between 1 and 30"),
  body("days").isArray({ min: 1 }).withMessage("At least one day is required"),
  body("days.*.dayNumber").isInt({ min: 1 }).withMessage("Day number must be a positive integer"),
  body("days.*.hotel.name").notEmpty().withMessage("Hotel name is required"),
  body("days.*.hotel.location").notEmpty().withMessage("Hotel location is required"),
  body("days.*.dayLabel").optional().isString().isLength({ max: 200 }).withMessage("Day label must be at most 200 characters"),
  body("days.*.activities.*.cost")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 1e9 })
    .withMessage("Activity cost must be a non-negative number"),
  body("days.*.activities.*.latitude")
    .optional({ checkFalsy: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage("Activity latitude must be between -90 and 90"),
  body("days.*.activities.*.longitude")
    .optional({ checkFalsy: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage("Activity longitude must be between -180 and 180"),
]

const validateReview = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Comment cannot exceed 2000 characters"),
]

// Routes — static paths before /:id (avoid /:id catching "saved")
router.get("/suggestions", protect, canTrips, getSearchSuggestions)
router.get("/saved/mine", protect, canTrips, getSavedItineraries)
router.get("/saved", protect, canTrips, getSavedItineraries)
router.route("/").get(protect, canTrips, getItineraries).post(optionalProtect, enforceTripLimit, validateItinerary, createItinerary)

router.post("/:id/save", protect, canTrips, saveItinerary)
router.post("/:id/refresh-cover-image", refreshItineraryCoverImage)
router.post("/:id/optimize", protect, canTrips, optimizeItinerary)
router.post("/:id/activities/:activityId/skip", protect, canTrips, adjustActivitySchedule)
router.post("/:id/collaborate/enable", protect, canTrips, enableCollaboration)
router.post("/:id/collaborate/join", protect, canTrips, joinCollaboration)
router.get("/:id/pdf", exportItineraryPdf)
router.get("/:id/reviews", getItineraryReviews)
router.post("/:id/reviews", protect, canTrips, idempotencyMiddleware, validateReview, addItineraryReview)
router.delete("/:id/save", protect, canTrips, unsaveItineraryForUser)
router.get("/:id/saved", protect, canTrips, checkItinerarySaved)
router.get("/:id/expenses/export/csv", protect, canExpenses, exportItineraryExpensesCsv)
router.get("/:id/expenses/export/pdf", protect, canExpenses, exportItineraryExpensesPdf)
router.get("/:id/expenses", protect, canExpenses, getItineraryExpenses)
router.post("/:id/expenses", protect, canExpenses, idempotencyMiddleware, addItineraryExpense)
router.put("/:id/expenses/:expenseId", protect, canExpenses, idempotencyMiddleware, updateItineraryExpense)
router.post("/:id/expenses/:expenseId/duplicate", protect, canExpenses, idempotencyMiddleware, duplicateItineraryExpense)
router.delete("/:id/expenses/:expenseId", protect, canExpenses, idempotencyMiddleware, removeItineraryExpense)

router
  .route("/:id")
  .get(protect, canTrips, getItinerary)
  .put(protect, canTrips, idempotencyMiddleware, updateItinerary)
  .delete(protect, canTrips, deleteItinerary)

export default router
