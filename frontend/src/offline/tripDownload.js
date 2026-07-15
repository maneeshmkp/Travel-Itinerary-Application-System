import { itineraryAPI, weatherAPI, notificationAPI } from "../services/api.js"
import {
  cacheTrip,
  cacheExpenseReport,
  cacheWeather,
  cacheMap,
  cacheNearby,
  getCachedTrip,
} from "./cacheService.js"

export async function downloadTripForOffline(tripId) {
  const [itineraryRes, expenseRes] = await Promise.allSettled([
    itineraryAPI.getById(tripId),
    itineraryAPI.getExpenses(tripId),
  ])

  const itinerary = itineraryRes.status === "fulfilled" ? itineraryRes.value.data?.data : null
  const expenses = expenseRes.status === "fulfilled" ? expenseRes.value.data?.data : null

  if (itinerary) {
    await cacheTrip(tripId, itinerary, { full: true })

    const markers = []
    for (const day of itinerary.days || []) {
      for (const act of day.activities || []) {
        if (act?.latitude && act?.longitude) {
          markers.push({
            lat: act.latitude,
            lng: act.longitude,
            title: act.name,
            dayNumber: day.dayNumber,
          })
        }
      }
    }
    await cacheMap(tripId, {
      destination: itinerary.destination,
      markers,
      center: markers[0] || null,
    })
  }

  if (expenses) await cacheExpenseReport(tripId, expenses)

  try {
    const wx = await weatherAPI.getPlaceWeather(tripId)
    if (wx.data) await cacheWeather(tripId, wx.data)
  } catch {
    // optional
  }

  try {
    const notes = await notificationAPI.getAll({ limit: 20 })
    // notifications cached by response interceptor
  } catch {
    // optional
  }

  return getCachedTrip(tripId)
}

/** Silently cache trip data when auto-download is enabled in offline settings. */
export async function maybeAutoDownloadTrip(tripId) {
  if (!tripId || !navigator.onLine) return null
  try {
    const { getOfflineSettings } = await import("./cacheService.js")
    const settings = await getOfflineSettings()
    if (!settings.autoDownloadTrips) return null
    return downloadTripForOffline(tripId)
  } catch (err) {
    console.warn("[offline] auto-download skipped:", err?.message || err)
    return null
  }
}
