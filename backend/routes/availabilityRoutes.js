import express from "express"
import {
  getMockHotels,
  getMockFlights,
  getMockActivities,
  getMockTrains,
  getMockBuses,
} from "../controllers/availabilityController.js"
import { publicApiRateLimiter } from "../middlewares/rateLimiter.js"

const router = express.Router()

router.use(publicApiRateLimiter)

router.get("/hotels", getMockHotels)
router.get("/flights", getMockFlights)
router.get("/trains", getMockTrains)
router.get("/buses", getMockBuses)
router.get("/activities", getMockActivities)

export default router
