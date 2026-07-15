import dotenv from "dotenv"
import mongoose from "mongoose"
import connectDB from "../config/db.js"
import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"
import { geocodeActivityFields } from "../services/activityGeocodingService.js"
import { hasValidCoordinates } from "../utils/geocodingQueryBuilder.js"
import { isGoogleGeocodingConfigured } from "../services/geocodingService.js"

dotenv.config()

const stats = {
  scanned: 0,
  added: 0,
  skipped: 0,
  failed: 0,
}

async function backfillActivityCoordinates() {
  await connectDB()

  if (isGoogleGeocodingConfigured()) {
    console.log("Google Geocoding API key detected.\n")
  } else {
    console.warn(
      "GOOGLE_GEOCODING_API_KEY not set — using known landmark catalog + Nominatim fallback.\n" +
        "Add your Google Maps API key (Geocoding API enabled) to backend/.env for best results.\n",
    )
  }

  const itineraries = await Itinerary.find({}).populate({
    path: "days",
    populate: {
      path: "activities",
      model: "Activity",
    },
  })

  for (const itinerary of itineraries) {
    for (const day of itinerary.days || []) {
      for (const activity of day.activities || []) {
        if (!activity?._id) continue

        stats.scanned++

        if (hasValidCoordinates(activity)) {
          stats.skipped++
          continue
        }

        const plain = activity.toObject ? activity.toObject() : activity
        const { activity: enriched, geocoded, failed } = await geocodeActivityFields(plain, {
          destination: itinerary.destination,
        })

        if (!geocoded) {
          if (failed) stats.failed += 1
          else stats.skipped += 1
          continue
        }

        await Activity.findByIdAndUpdate(activity._id, {
          latitude: enriched.latitude,
          longitude: enriched.longitude,
          geocodedName: enriched.geocodedName,
        })

        stats.added += 1
      }
    }
  }
}

async function main() {
  try {
    console.log("Starting activity coordinate backfill…\n")
    await backfillActivityCoordinates()

    console.log("\n--- Backfill summary ---")
    console.log(`Total activities scanned: ${stats.scanned}`)
    console.log(`Coordinates added:        ${stats.added}`)
    console.log(`Skipped (already had):    ${stats.skipped}`)
    console.log(`Failed:                   ${stats.failed}`)

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error("Fatal error:", err.message)
    try {
      await mongoose.disconnect()
    } catch {
      // ignore disconnect errors
    }
    process.exit(1)
  }
}

main()
