import { normalizeFlightStatus } from "../constants/flightStatus.js"

export function mapProviderToFlightStatus(raw = {}, existing = {}) {
  return {
    airline: raw.airline || existing.airline || "",
    flightNumber: String(raw.flightNumber || existing.flightNumber || "").toUpperCase(),
    origin: raw.origin || raw.originName || existing.origin || "",
    originCode: String(raw.originCode || raw.origin || existing.originCode || "").toUpperCase().slice(0, 4),
    destination: raw.destination || raw.destinationName || existing.destination || "",
    destinationCode: String(raw.destinationCode || raw.destination || existing.destinationCode || "")
      .toUpperCase()
      .slice(0, 4),
    departureTime: raw.departureTime ? new Date(raw.departureTime) : existing.departureTime,
    arrivalTime: raw.arrivalTime ? new Date(raw.arrivalTime) : existing.arrivalTime,
    actualDeparture: raw.actualDeparture ? new Date(raw.actualDeparture) : raw.actualDeparture,
    actualArrival: raw.actualArrival ? new Date(raw.actualArrival) : raw.actualArrival,
    terminal: raw.terminal || existing.terminal || "",
    gate: raw.gate || existing.gate || "",
    boardingTime: raw.boardingTime ? new Date(raw.boardingTime) : raw.boardingTime,
    status: normalizeFlightStatus(raw.status || existing.status),
    baggageClaim: raw.baggageClaim || raw.baggage || "",
    aircraftType: raw.aircraftType || raw.aircraft || "",
    durationMinutes: Number(raw.durationMinutes) || existing.durationMinutes || 0,
    delayMinutes: Math.max(0, Number(raw.delayMinutes) || 0),
    provider: raw.provider || existing.provider || "mock",
    metadata: { ...(existing.metadata || {}), ...(raw.metadata || {}) },
  }
}

export function serializeFlightStatus(doc) {
  const d = doc.toObject ? doc.toObject() : doc
  const dep = d.departureTime ? new Date(d.departureTime) : null
  const arr = d.arrivalTime ? new Date(d.arrivalTime) : null
  const now = Date.now()
  let countdownMinutes = null
  if (dep && d.status !== "Landed" && d.status !== "Cancelled") {
    countdownMinutes = Math.max(0, Math.round((dep - now) / 60000))
  }

  return {
    id: String(d._id),
    userId: String(d.userId),
    tripId: String(d.tripId),
    bookingId: d.bookingId ? String(d.bookingId) : null,
    airline: d.airline || "",
    flightNumber: d.flightNumber || "",
    origin: d.origin || "",
    originCode: d.originCode || "",
    destination: d.destination || "",
    destinationCode: d.destinationCode || "",
    departureTime: d.departureTime || null,
    arrivalTime: d.arrivalTime || null,
    actualDeparture: d.actualDeparture || null,
    actualArrival: d.actualArrival || null,
    terminal: d.terminal || "",
    gate: d.gate || "",
    previousGate: d.previousGate || "",
    boardingTime: d.boardingTime || null,
    status: d.status || "Scheduled",
    baggageClaim: d.baggageClaim || "",
    aircraftType: d.aircraftType || "",
    durationMinutes: d.durationMinutes || (dep && arr ? Math.round((arr - dep) / 60000) : 0),
    delayMinutes: d.delayMinutes || 0,
    trackingActive: Boolean(d.trackingActive),
    provider: d.provider || "mock",
    lastUpdated: d.lastUpdated || d.updatedAt,
    countdownMinutes,
    metadata: d.metadata || {},
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function parseFlightNumberInput(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

export function extractAirlineFromFlightNumber(flightNumber) {
  const m = String(flightNumber || "").match(/^([A-Z]{2,3})/)
  return m ? m[1] : ""
}
