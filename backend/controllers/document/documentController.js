import {
  listDocuments,
  searchDocuments,
  getDocumentById,
  listTripDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  toggleFavorite,
  getDownloadInfo,
  streamDocumentFile,
  streamThumbnail,
  getExpiryTimeline,
  getMissingDocuments,
  getDocumentStats,
} from "../../services/documents/documentService.js"
import { notifyDocumentUploaded } from "../../services/notifications/notificationTriggers.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  return res.status(status).json({ success: false, message: err.message || "Request failed" })
}

export const getDocuments = async (req, res) => {
  try {
    const data = await listDocuments(req.user._id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const searchDocumentsHandler = async (req, res) => {
  try {
    const data = await searchDocuments(req.user._id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getDocument = async (req, res) => {
  try {
    const data = await getDocumentById(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getTripDocuments = async (req, res) => {
  try {
    const data = await listTripDocuments(req.user._id, req.params.id, req.query)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postDocument = async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file received. Use multipart/form-data with field name \"file\".",
      })
    }
    const data = await createDocument(req.user._id, { file, body: req.body, req })
    notifyDocumentUploaded(req.user._id, data).catch(() => {})
    res.status(201).json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const putDocument = async (req, res) => {
  try {
    const data = await updateDocument(req.user._id, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const removeDocument = async (req, res) => {
  try {
    const data = await deleteDocument(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const favoriteDocument = async (req, res) => {
  try {
    const data = await toggleFavorite(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const downloadDocument = async (req, res) => {
  try {
    const data = await getDownloadInfo(req.user._id, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const serveDocumentFile = async (req, res) => {
  try {
    const userId = req.user?._id || null
    const { buffer, mimeType, fileName } = await streamDocumentFile(
      userId,
      req.params.id,
      req.query.token,
    )
    res.setHeader("Content-Type", mimeType)
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.send(buffer)
  } catch (err) {
    handleError(res, err)
  }
}

export const serveThumbnail = async (req, res) => {
  try {
    const userId = req.user?._id || null
    const { buffer, mimeType } = await streamThumbnail(userId, req.params.id, req.query.token)
    res.setHeader("Content-Type", mimeType)
    res.setHeader("Cache-Control", "private, max-age=300")
    res.send(buffer)
  } catch (err) {
    handleError(res, err)
  }
}

export const getTimeline = async (req, res) => {
  try {
    const items = await getExpiryTimeline(req.user._id)
    res.json({ success: true, data: { items } })
  } catch (err) {
    handleError(res, err)
  }
}

export const getMissing = async (req, res) => {
  try {
    const tripId = req.query.tripId || req.params.tripId
    const data = await getMissingDocuments(req.user._id, tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getStats = async (req, res) => {
  try {
    const data = await getDocumentStats(req.user._id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getAiContext = async (req, res) => {
  try {
    const { getDocumentsForAi } = await import("../../services/documents/documentService.js")
    const items = await getDocumentsForAi(req.user._id, {
      tripId: req.query.tripId || null,
      query: req.query.q || "",
    })
    res.json({ success: true, data: { items } })
  } catch (err) {
    handleError(res, err)
  }
}
