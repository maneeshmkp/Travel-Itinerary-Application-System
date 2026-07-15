import express from "express"
import { getForecast, getPlaceWeather, getWeather } from "../controllers/weatherController.js"
import { publicApiRateLimiter } from "../middlewares/rateLimiter.js"

const router = express.Router()

router.get("/places/:tripId", publicApiRateLimiter, getPlaceWeather)
router.get("/forecast", publicApiRateLimiter, getForecast)
router.get("/", publicApiRateLimiter, getWeather)

export default router
