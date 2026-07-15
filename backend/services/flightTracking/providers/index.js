import { mapProviderToFlightStatus } from "../../../utils/flightMapper.js"
import { fetchMockFlightStatus } from "./mockProvider.js"

const CACHE = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

function cacheKey(params) {
  return JSON.stringify({
    fn: params.flightNumber,
    date: params.departureTime ? new Date(params.departureTime).toISOString().slice(0, 10) : "",
  })
}

async function fetchAviationStack({ flightNumber, departureTime }) {
  const key = process.env.AVIATIONSTACK_API_KEY?.trim()
  if (!key) return null

  const date = departureTime ? new Date(departureTime).toISOString().slice(0, 10) : ""
  const url = new URL("http://api.aviationstack.com/v1/flights")
  url.searchParams.set("access_key", key)
  url.searchParams.set("flight_iata", String(flightNumber).toUpperCase())
  if (date) url.searchParams.set("flight_date", date)

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) })
  if (!res.ok) return null
  const json = await res.json()
  const row = json?.data?.[0]
  if (!row) return null

  const dep = row.departure || {}
  const arr = row.arrival || {}
  const delay = Number(dep.delay) || 0

  let status = "Scheduled"
  const fs = String(row.flight_status || "").toLowerCase()
  if (fs.includes("cancel")) status = "Cancelled"
  else if (fs.includes("land") || fs.includes("arriv")) status = "Landed"
  else if (fs.includes("active") || fs.includes("en-route")) status = "In Air"
  else if (delay > 15) status = "Delayed"

  return mapProviderToFlightStatus({
    flightNumber: row.flight?.iata || flightNumber,
    airline: row.airline?.name || row.airline?.iata || "",
    originCode: dep.iata || dep.airport || "",
    destinationCode: arr.iata || arr.airport || "",
    origin: dep.airport || "",
    destination: arr.airport || "",
    departureTime: dep.scheduled || dep.estimated,
    arrivalTime: arr.scheduled || arr.estimated,
    actualDeparture: dep.actual,
    actualArrival: arr.actual,
    terminal: dep.terminal || "",
    gate: dep.gate || "",
    baggageClaim: arr.baggage || "",
    aircraftType: row.aircraft?.iata || "",
    status,
    delayMinutes: delay,
    provider: "aviationstack",
  })
}

export async function fetchLiveFlightStatus(params = {}) {
  const key = cacheKey(params)
  const cached = CACHE.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data

  let data = await fetchAviationStack(params)
  if (!data) {
    data = await fetchMockFlightStatus(params)
  }

  CACHE.set(key, { at: Date.now(), data })
  return data
}

export function clearFlightStatusCache() {
  CACHE.clear()
}
