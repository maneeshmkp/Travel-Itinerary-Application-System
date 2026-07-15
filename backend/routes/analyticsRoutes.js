import express from "express"
import { param } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import { logBookingClick } from "../controllers/analyticsController.js"
import {
  getDashboard,
  getYear,
  getMonth,
  getScore,
  postRecalculate,
  exportCsv,
  exportPdf,
} from "../controllers/analytics/travelAnalyticsController.js"

const router = express.Router()

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

router.post("/booking-click", logBookingClick)

router.use(protect)
router.get("/dashboard", getDashboard)
router.get("/travel-score", getScore)
router.post("/recalculate", postRecalculate)
router.get("/export/csv", exportCsv)
router.get("/export/pdf", exportPdf)
router.get("/year/:year", param("year").isInt({ min: 2000, max: 2100 }), handleValidation, getYear)
router.get("/month/:month", handleValidation, getMonth)

export default router
