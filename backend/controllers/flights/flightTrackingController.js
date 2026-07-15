import {
  getLiveStatusByFlightNumber,
  startTracking,
  stopTracking,
  getTripFlights,
  getTrackingHistory,
  refreshFlightRecord,
} from "../../services/flightTracking/flightTrackingService.js"
import FlightStatus from "../../models/FlightStatus.js"
import Itinerary from "../../models/Itinerary.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  return res.status(status).json({ success: false, message: err.message || "Request failed" })
}

export const getStatus = async (req, res) => {
  try {
    const data = await getLiveStatusByFlightNumber(req.user._id, req.params.flightNumber, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postTrack = async (req, res) => {
  try {
    const data = await startTracking(req.user._id, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const deleteTrack = async (req, res) => {
  try {
    const data = await stopTracking(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getTripFlightsHandler = async (req, res) => {
  try {
    const data = await getTripFlights(req.user._id, req.params.tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getHistory = async (req, res) => {
  try {
    const data = await getTrackingHistory(req.user._id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postRefresh = async (req, res) => {
  try {
    const doc = await FlightStatus.findOne({ _id: req.params.id, userId: req.user._id })
    if (!doc) return res.status(404).json({ success: false, message: "Not found" })
    const trip = await Itinerary.findById(doc.tripId).select("title")
    const data = await refreshFlightRecord(doc, trip)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}
