import Itinerary from "../../models/Itinerary.js"
import { analyzeTripRisks } from "../risk/riskService.js"

function daysUntil(date, now = new Date()) {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d - now) / (24 * 60 * 60 * 1000))
}

export async function runRiskAnalysisReminders(now = new Date()) {
  const trips = await Itinerary.find({
    startDate: { $exists: true, $ne: null },
  })
    .select("title startDate ownerId")
    .lean()

  let count = 0
  for (const trip of trips) {
    const userId = trip.ownerId
    if (!userId) continue
    const days = daysUntil(trip.startDate, now)
    if (days === null || days < 0 || days > 14) continue
    try {
      await analyzeTripRisks(userId, trip._id, { force: false })
      count += 1
    } catch {
      // skip unauthorized or missing trips
    }
  }
  return count
}
