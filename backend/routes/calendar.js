import express from "express"
import { body, query } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import {
  getStatus,
  googleConnect,
  googleCallback,
  googleDisconnect,
  outlookConnect,
  outlookCallback,
  outlookDisconnect,
  listEvents,
  syncCalendar,
  exportCalendar,
  importCalendar,
  tripCalendarStatus,
} from "../controllers/calendar/calendarController.js"

const router = express.Router()

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

router.get("/google/callback", googleCallback)
router.get("/outlook/callback", outlookCallback)

router.use(protect)

router.get("/status", getStatus)
router.get("/events", query("tripId").notEmpty(), handleValidation, listEvents)
router.get("/trip/:tripId/status", tripCalendarStatus)

router.post("/google/connect", googleConnect)
router.post("/google/disconnect", googleDisconnect)
router.post("/outlook/connect", outlookConnect)
router.post("/outlook/disconnect", outlookDisconnect)

router.post("/sync", body("tripId").notEmpty(), handleValidation, syncCalendar)
router.post("/export", body("tripId").notEmpty(), handleValidation, exportCalendar)
router.post("/import", body("tripId").notEmpty(), body("ics").notEmpty(), handleValidation, importCalendar)

export default router
