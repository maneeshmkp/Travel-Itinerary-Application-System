import { refreshActiveFlights } from "./flightTrackingService.js"

const POLL_MS = 10 * 60 * 1000
let timer = null

export function startFlightTrackingPoller() {
  if (process.env.FLIGHT_TRACKING_POLLER === "false") return
  if (timer) return

  const tick = async () => {
    try {
      const count = await refreshActiveFlights()
      if (count > 0) {
        console.log(`[flight-tracking] Refreshed ${count} active flight(s)`)
      }
    } catch (err) {
      console.error("[flight-tracking] Poll error:", err.message)
    }
  }

  tick()
  timer = setInterval(tick, POLL_MS)
  console.log(`Flight tracking poller: every ${POLL_MS / 60000} minutes`)
}

export function stopFlightTrackingPoller() {
  if (timer) clearInterval(timer)
  timer = null
}
