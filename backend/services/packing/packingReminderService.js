import PackingList from "../../models/PackingList.js"
import Itinerary from "../../models/Itinerary.js"
import { flattenCategories } from "../../utils/packingHelpers.js"
import { notifyPackingReminder } from "../notifications/notificationTriggers.js"

function daysUntil(date, now = new Date()) {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d - now) / (24 * 60 * 60 * 1000))
}

export async function runPackingReminders(now = new Date()) {
  const trips = await Itinerary.find({
    startDate: { $exists: true, $ne: null },
    ownerId: { $exists: true, $ne: null },
  })
    .select("title startDate ownerId")
    .lean()

  let count = 0
  for (const trip of trips) {
    const days = daysUntil(trip.startDate, now)
    if (days === null || days < 0 || days > 3) continue

    const list = await PackingList.findOne({ userId: trip.ownerId, tripId: trip._id }).lean()
    if (!list) {
      const n = await notifyPackingReminder(trip.ownerId, trip, {
        message: `Your trip "${trip.title}" starts in ${days} day(s). Generate your packing list.`,
        dedupKey: `packing-missing-${trip._id}-${days}`,
      })
      if (n) count += 1
      continue
    }

    const unpacked = flattenCategories(list.categories).filter((i) => !i.packed && i.essential)
    const docMissing = unpacked.filter((i) => i.missing || i.category === "documents")
    const target = docMissing[0] || unpacked[0]
    if (!target) continue

    const n = await notifyPackingReminder(trip.ownerId, trip, {
      message: `You haven't packed your ${target.name.toLowerCase()} for "${trip.title}".`,
      dedupKey: `packing-item-${trip._id}-${target.id}-${days}`,
    })
    if (n) count += 1
  }
  return count
}
