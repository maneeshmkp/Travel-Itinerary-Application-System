import express from "express"
import {
  enrichDescriptions,
  suggestDay,
  suggestHighlights,
  tripSummary,
  generatePersonalizedItinerary,
  bookingQuery,
  documentQuery,
  riskQuery,
  flightQuery,
  budgetQuery,
} from "../controllers/aiController.js"
import { protect } from "../middlewares/authMiddleware.js"
import { requirePermission } from "../middlewares/rbac.js"
import { PERMISSIONS } from "../constants/rbac.js"
import { aiRateLimiter } from "../middlewares/rateLimiter.js"
import { requirePlanLimit, trackAiUsageOnSuccess } from "../middlewares/tenant.js"

const router = express.Router()

const canUseAi = requirePermission(PERMISSIONS.AI_USE)
const aiGuard = [protect, canUseAi, requirePlanLimit("aiRequests"), trackAiUsageOnSuccess, aiRateLimiter]

router.post("/enrich-descriptions", ...aiGuard, enrichDescriptions)
router.post("/suggest-day", ...aiGuard, suggestDay)
router.post("/suggest-highlights", ...aiGuard, suggestHighlights)
router.post("/trip-summary", ...aiGuard, tripSummary)
router.post("/booking-query", ...aiGuard, bookingQuery)
router.post("/document-query", ...aiGuard, documentQuery)
router.post("/risk-query", ...aiGuard, riskQuery)
router.post("/flight-query", ...aiGuard, flightQuery)
router.post("/budget-query", ...aiGuard, budgetQuery)
router.post("/itinerary", ...aiGuard, generatePersonalizedItinerary)

export default router
