import {
  generatePackingList,
  regeneratePackingList,
  getPackingList,
  updatePackingItem,
  addCustomItem,
  deletePackingItem,
  searchPackingItems,
} from "../../services/packing/packingService.js"
import { buildPackingCsv, buildPackingPdfBuffer } from "../../services/packing/packingExportService.js"
import Itinerary from "../../models/Itinerary.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  return res.status(status).json({ success: false, message: err.message || "Request failed" })
}

export const postGenerate = async (req, res) => {
  try {
    const tripId = req.body?.tripId || req.params.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await generatePackingList(req.user._id, tripId)
    res.status(201).json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postRegenerate = async (req, res) => {
  try {
    const tripId = req.body?.tripId || req.params.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await regeneratePackingList(req.user._id, tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getByTrip = async (req, res) => {
  try {
    const data = await getPackingList(req.user._id, req.params.tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const putItem = async (req, res) => {
  try {
    const tripId = req.body?.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await updatePackingItem(req.user._id, tripId, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postCustom = async (req, res) => {
  try {
    const tripId = req.body?.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await addCustomItem(req.user._id, tripId, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const deleteItem = async (req, res) => {
  try {
    const tripId = req.query.tripId || req.body?.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await deletePackingItem(req.user._id, tripId, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const searchItems = async (req, res) => {
  try {
    const data = await searchPackingItems(req.user._id, req.params.tripId, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const exportCsv = async (req, res) => {
  try {
    const data = await getPackingList(req.user._id, req.params.tripId)
    if (!data.exists) return res.status(404).json({ success: false, message: "No packing list" })
    const trip = await Itinerary.findById(req.params.tripId).select("title").lean()
    const csv = buildPackingCsv({ ...data, tripTitle: trip?.title })
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="packing-${req.params.tripId}.csv"`)
    res.send(csv)
  } catch (err) {
    handleError(res, err)
  }
}

export const exportPdf = async (req, res) => {
  try {
    const data = await getPackingList(req.user._id, req.params.tripId)
    if (!data.exists) return res.status(404).json({ success: false, message: "No packing list" })
    const trip = await Itinerary.findById(req.params.tripId).select("title").lean()
    const buffer = await buildPackingPdfBuffer(data, trip?.title || "Trip")
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="packing-${req.params.tripId}.pdf"`)
    res.send(buffer)
  } catch (err) {
    handleError(res, err)
  }
}
