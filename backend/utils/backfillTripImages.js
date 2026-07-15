import dotenv from "dotenv"
import connectDB from "../config/db.js"
import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"
import {
  getTripCoverImage,
  isCoverImageAccessible,
  isCoverImageRelevant,
  getCoverImageUrl,
  urlStem,
} from "../services/tripImageService.js"

dotenv.config()

const force = process.argv.includes("--force")

async function backfillTripImages() {
  await connectDB()

  void Day
  void Activity

  const itineraries = await Itinerary.find({}).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })

  let ok = 0
  let fallback = 0
  let skip = 0
  let fail = 0
  const usedStems = new Set()

  for (const trip of itineraries) {
    const title = trip.title || String(trip._id)
    const needsRepair =
      force ||
      !isCoverImageRelevant(trip) ||
      !(await isCoverImageAccessible(trip)) ||
      usedStems.has(urlStem(getCoverImageUrl(trip)))

    if (!needsRepair) {
      const stem = urlStem(getCoverImageUrl(trip))
      if (stem) usedStems.add(stem)
      console.log(`[skip] ${title} → already has valid relevant cover image`)
      skip += 1
      continue
    }

    try {
      const previous = getCoverImageUrl(trip)
      const coverImage = await getTripCoverImage(trip, { excludeStems: usedStems })
      trip.coverImage = coverImage
      await trip.save()

      const stem = urlStem(coverImage?.url)
      if (stem) usedStems.add(stem)

      const via = coverImage.source === "unsplash" ? "ok" : "fallback"
      if (via === "ok") {
        console.log(`[ok] ${title} → ${coverImage.query}`)
        ok += 1
      } else {
        console.log(`[fallback] ${title} → ${coverImage.query}`)
        fallback += 1
      }

      if (previous && previous !== coverImage.url) {
        console.log(`       replaced: ${previous.slice(0, 72)}…`)
      }
    } catch (err) {
      console.log(`[fail] ${title} → ${err?.message || err}`)
      fail += 1
    }
  }

  console.log("\n--- Trip image backfill summary ---")
  console.log(`Total trips:  ${itineraries.length}`)
  console.log(`Updated (API): ${ok}`)
  console.log(`Updated (fallback): ${fallback}`)
  console.log(`Skipped:      ${skip}`)
  console.log(`Failed:       ${fail}`)
  process.exit(fail > 0 ? 1 : 0)
}

backfillTripImages().catch((err) => {
  console.error(err)
  process.exit(1)
})
