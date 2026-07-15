import {
  analyzeTripRisks,
  getTripRisks,
  resolveTripRisk,
  replanForRisk,
} from "../../services/risk/riskService.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  return res.status(status).json({ success: false, message: err.message || "Request failed" })
}

export const postAnalyze = async (req, res) => {
  try {
    const tripId = req.body?.tripId || req.params.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const force = Boolean(req.body?.force)
    const data = await analyzeTripRisks(req.user._id, tripId, { force })
    res.status(200).json({ success: true, demo: Boolean(data.demo), data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getByTrip = async (req, res) => {
  try {
    const data = await getTripRisks(req.user._id, req.params.tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postReplan = async (req, res) => {
  try {
    const tripId = req.body?.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await replanForRisk(req.user._id, {
      tripId,
      riskId: req.body?.riskId,
      dayNumber: req.body?.dayNumber,
      apply: Boolean(req.body?.apply),
    })
    res.json({ success: true, demo: Boolean(data.demo), data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postResolve = async (req, res) => {
  try {
    const status = req.body?.status || "RESOLVED"
    const data = await resolveTripRisk(req.user._id, req.params.id, { status })
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}
