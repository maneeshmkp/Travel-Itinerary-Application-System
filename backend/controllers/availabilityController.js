import {
  getHotelsAvailability,
  getFlightsAvailability,
  getActivitiesAvailability,
  getTrainsAvailability,
  getBusesAvailability,
} from "../services/availabilityService.js"
import { parseNamesFromQuery } from "../utils/namesQueryParser.js"

function badRequest(res, message) {
  return res.status(400).json({ success: false, message })
}

function serviceError(res, err) {
  const status = err?.statusCode || err?.status || 503
  return res.status(status).json({
    success: false,
    message: err?.message || "Availability service unavailable",
  })
}

function sendAvailabilityResult(res, result) {
  res.status(200).json({
    success: true,
    demo: Boolean(result.demo),
    source: result.source,
    realData: !result.demo,
    warning: result.warning || undefined,
    count: result.data.length,
    data: result.data,
  })
}

/** GET /api/hotels?destination=&checkIn=&nights=&name=&currency= */
export const getMockHotels = async (req, res, next) => {
  try {
    const destination = String(req.query.destination || "").trim()
    if (!destination) {
      return badRequest(res, "destination query parameter is required")
    }

    const nights = req.query.nights != null ? Number(req.query.nights) : 1
    const result = await getHotelsAvailability({
      destination,
      checkIn: req.query.checkIn,
      nights: Number.isFinite(nights) ? nights : 1,
      name: req.query.name,
      names: parseNamesFromQuery(req.query.names),
      currency: req.query.currency || "USD",
    })

    sendAvailabilityResult(res, result)
  } catch (error) {
    if (error?.statusCode || error?.status) return serviceError(res, error)
    next(error)
  }
}

/** GET /api/flights?destination=&origin=&date=&passengers=&currency= */
export const getMockFlights = async (req, res, next) => {
  try {
    const destination = String(req.query.destination || "").trim()
    if (!destination) {
      return badRequest(res, "destination query parameter is required")
    }

    const passengers = req.query.passengers != null ? Number(req.query.passengers) : 1
    const result = await getFlightsAvailability({
      destination,
      origin: req.query.origin,
      date: req.query.date,
      passengers: Number.isFinite(passengers) ? passengers : 1,
      currency: req.query.currency || "USD",
    })

    sendAvailabilityResult(res, result)
  } catch (error) {
    if (error?.statusCode || error?.status) return serviceError(res, error)
    next(error)
  }
}

/** GET /api/trains?destination=&origin=&date=&passengers=&currency= */
export const getMockTrains = async (req, res, next) => {
  try {
    const destination = String(req.query.destination || "").trim()
    if (!destination) {
      return badRequest(res, "destination query parameter is required")
    }

    const passengers = req.query.passengers != null ? Number(req.query.passengers) : 1
    const result = await getTrainsAvailability({
      destination,
      origin: req.query.origin,
      date: req.query.date,
      passengers: Number.isFinite(passengers) ? passengers : 1,
      currency: req.query.currency || "USD",
    })

    sendAvailabilityResult(res, result)
  } catch (error) {
    if (error?.statusCode || error?.status) return serviceError(res, error)
    next(error)
  }
}

/** GET /api/buses?destination=&origin=&date=&passengers=&currency= */
export const getMockBuses = async (req, res, next) => {
  try {
    const destination = String(req.query.destination || "").trim()
    if (!destination) {
      return badRequest(res, "destination query parameter is required")
    }

    const passengers = req.query.passengers != null ? Number(req.query.passengers) : 1
    const result = await getBusesAvailability({
      destination,
      origin: req.query.origin,
      date: req.query.date,
      passengers: Number.isFinite(passengers) ? passengers : 1,
      currency: req.query.currency || "USD",
    })

    sendAvailabilityResult(res, result)
  } catch (error) {
    if (error?.statusCode || error?.status) return serviceError(res, error)
    next(error)
  }
}

/** GET /api/activities?destination=&names=pipe-separated&day=&currency= */
export const getMockActivities = async (req, res, next) => {
  try {
    const destination = String(req.query.destination || "").trim()
    if (!destination) {
      return badRequest(res, "destination query parameter is required")
    }

    const day = req.query.day != null ? Number(req.query.day) : undefined
    const result = await getActivitiesAvailability({
      destination,
      names: parseNamesFromQuery(req.query.names),
      day: Number.isFinite(day) ? day : undefined,
      currency: req.query.currency || "USD",
    })

    sendAvailabilityResult(res, result)
  } catch (error) {
    if (error?.statusCode || error?.status) return serviceError(res, error)
    next(error)
  }
}
