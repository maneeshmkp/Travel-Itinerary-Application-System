export async function processFlightStatusJob() {
  const { refreshActiveFlights } = await import("../services/flightTracking/flightTrackingService.js")
  const count = await refreshActiveFlights()
  return { refreshed: count || 0 }
}
