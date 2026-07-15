import express from "express"
import { body, param } from "express-validator"
import { validationResult } from "express-validator"
import { protect } from "../middlewares/authMiddleware.js"
import {
  getStatus,
  postTrack,
  deleteTrack,
  getTripFlightsHandler,
  getHistory,
  postRefresh,
} from "../controllers/flights/flightTrackingController.js"

const router = express.Router()
router.use(protect)

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", details: errors.array() })
  }
  next()
}

router.get("/history", getHistory)
router.get("/status/:flightNumber", getStatus)
router.post("/track", body("tripId").isMongoId(), handleValidation, postTrack)
router.post("/refresh/:id", param("id").isMongoId(), handleValidation, postRefresh)
router.delete("/track/:id", param("id").isMongoId(), handleValidation, deleteTrack)
router.get("/trip/:tripId", param("tripId").isMongoId(), handleValidation, getTripFlightsHandler)

export default router
