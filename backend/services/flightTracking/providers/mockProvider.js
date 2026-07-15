import { mapProviderToFlightStatus } from "../../../utils/flightMapper.js"
import { normalizeFlightStatus } from "../../../constants/flightStatus.js"

function hoursFromNow(h) {
  const d = new Date()
  d.setHours(d.getHours() + h)
  return d
}

function statusFromTimeline(departure, now = new Date()) {
  const dep = new Date(departure)
  const diffMin = (dep - now) / 60000
  if (diffMin > 180) return "Scheduled"
  if (diffMin > 45) return "Scheduled"
  if (diffMin > 15) return "Boarding"
  if (diffMin > -30) return "In Air"
  return "Landed"
}

/**
 * Demo/mock provider — deterministic status from flight number + departure time.
 */
export async function fetchMockFlightStatus({ flightNumber, originCode, destinationCode, departureTime, delayMinutes = 0 }) {
  const fn = String(flightNumber || "XX000").toUpperCase()
  const dep = departureTime ? new Date(departureTime) : hoursFromNow(3)
  const duration = 120 + (fn.charCodeAt(fn.length - 1) % 90)
  const arr = new Date(dep.getTime() + duration * 60000)

  let delay = delayMinutes
  if (fn.includes("DELAY") || fn.endsWith("9")) delay = 90
  if (fn.includes("CANCEL") || fn.endsWith("0")) {
    return mapProviderToFlightStatus({
      flightNumber: fn,
      airline: fn.slice(0, 2),
      originCode: originCode || "DEL",
      destinationCode: destinationCode || "BOM",
      origin: "Origin Airport",
      destination: "Destination Airport",
      departureTime: dep,
      arrivalTime: arr,
      status: "Cancelled",
      delayMinutes: 0,
      gate: "",
      terminal: "1",
      provider: "mock",
    })
  }

  const adjustedDep = new Date(dep.getTime() + delay * 60000)
  const status = delay > 30 ? "Delayed" : statusFromTimeline(adjustedDep)
  const gateNum = (fn.charCodeAt(2) || 65) % 20
  const gate = `${String.fromCharCode(65 + (gateNum % 3))}${(gateNum % 12) + 1}`

  const boarding = new Date(adjustedDep.getTime() - 45 * 60000)
  const baggage = status === "Landed" ? String((gateNum % 8) + 1) : ""

  return mapProviderToFlightStatus({
    flightNumber: fn,
    airline: fn.slice(0, 2),
    originCode: originCode || "DEL",
    destinationCode: destinationCode || "BOM",
    origin: "Departure Airport",
    destination: "Arrival Airport",
    departureTime: adjustedDep,
    arrivalTime: new Date(arr.getTime() + delay * 60000),
    boardingTime: boarding,
    status: normalizeFlightStatus(status),
    delayMinutes: delay,
    gate,
    terminal: String((gateNum % 3) + 1),
    aircraftType: "A320neo",
    durationMinutes: duration,
    baggageClaim: baggage,
    provider: "mock",
    metadata: { demo: true },
  })
}
