import {
  analyzeTripBudget,
  getTripOptimization,
  applyRecommendations,
  simulateWhatIf,
} from "../../services/budgetOptimizer/budgetOptimizerService.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  return res.status(status).json({ success: false, message: err.message || "Request failed" })
}

export const postAnalyze = async (req, res) => {
  try {
    const tripId = req.body?.tripId || req.params.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const force = Boolean(req.body?.force)
    const data = await analyzeTripBudget(req.user._id, tripId, { force })
    res.status(200).json({ success: true, demo: Boolean(data.demo), data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getByTrip = async (req, res) => {
  try {
    const data = await getTripOptimization(req.user._id, req.params.tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postApply = async (req, res) => {
  try {
    const tripId = req.body?.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await applyRecommendations(req.user._id, {
      tripId,
      recommendationIds: req.body?.recommendationIds || req.body?.acceptedIds || [],
      rejectIds: req.body?.rejectIds || [],
    })
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postSimulate = async (req, res) => {
  try {
    const tripId = req.body?.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await simulateWhatIf(req.user._id, {
      tripId,
      changes: req.body?.changes || {},
    })
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}
