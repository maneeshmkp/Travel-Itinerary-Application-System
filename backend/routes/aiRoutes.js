import express from "express"
import { enrichDescriptions, suggestDay, suggestHighlights, tripSummary } from "../controllers/aiController.js"
import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

router.post("/enrich-descriptions", protect, enrichDescriptions)
router.post("/suggest-day", protect, suggestDay)
router.post("/suggest-highlights", protect, suggestHighlights)
router.post("/trip-summary", protect, tripSummary)

export default router
