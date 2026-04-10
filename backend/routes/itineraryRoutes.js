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
} from "../controllers/itineraryController.js"
import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

// Validation middleware for creating itinerary
const validateItinerary = [
  body("title").notEmpty().withMessage("Title is required").trim(),
  body("destination").notEmpty().withMessage("Destination is required").trim(),
  body("numberOfNights").isInt({ min: 1, max: 30 }).withMessage("Number of nights must be between 1 and 30"),
  body("days").isArray({ min: 1 }).withMessage("At least one day is required"),
  body("days.*.dayNumber").isInt({ min: 1 }).withMessage("Day number must be a positive integer"),
  body("days.*.hotel.name").notEmpty().withMessage("Hotel name is required"),
  body("days.*.hotel.location").notEmpty().withMessage("Hotel location is required"),
]

// Routes — static paths before /:id (avoid /:id catching "saved")
router.get("/suggestions", getSearchSuggestions)
router.get("/saved/mine", protect, getSavedItineraries)
router.get("/saved", protect, getSavedItineraries)
router.route("/").get(getItineraries).post(validateItinerary, createItinerary)

router.post("/:id/save", protect, saveItinerary)
router.delete("/:id/save", protect, unsaveItineraryForUser)
router.get("/:id/saved", protect, checkItinerarySaved)

router.route("/:id").get(getItinerary).put(updateItinerary).delete(deleteItinerary)

export default router
