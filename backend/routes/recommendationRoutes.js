import express from "express"
import { getRecommendations, getDestinations, getSimilarItineraries } from "../controllers/recommendationController.js"

const router = express.Router()

// Routes
router.get("/", getRecommendations)
router.get("/destinations", getDestinations)
router.get("/similar/:id", getSimilarItineraries)

export default router
