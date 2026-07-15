import { randomUUID } from "crypto"
import TravelDocument from "../../models/TravelDocument.js"
import Itinerary from "../../models/Itinerary.js"
import {
  normalizeDocumentType,
  documentTypeLabel,
  INTERNATIONAL_REQUIRED_TYPES,
  TRIP_ESSENTIAL_TYPES,
} from "../../constants/documentTypes.js"
import { enforceFileSecurity, auditFileUpload } from "../security/fileSecurity.js"
import { createSignedDownloadToken } from "../../utils/signedUrl.js"
import { runDocumentOcr } from "../documentOCR/documentOCRService.js"
import { getExpiryStatus } from "../documentReminder.js"
import {
  storeDocumentFile,
  storeThumbnail,
  readDocumentFile,
  getSignedDownloadUrl,
  deleteDocumentFiles,
} from "../storage/index.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"

function throwStatus(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

async function assertTripAccess(userId, tripId) {
  if (!tripId) return null
  const trip = await Itinerary.findById(tripId).select("ownerId title destination country collaborators")
  if (!trip) throwStatus("Trip not found", 404)
  if (!canAccessTripData(trip, userId)) throwStatus("Not authorized for this trip", 403)
  return trip
}

async function assertDocumentOwner(userId, documentId) {
  const doc = await TravelDocument.findOne({ _id: documentId, userId })
  if (!doc) throwStatus("Document not found", 404)
  return doc
}

function parseTags(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function serializeDocument(doc, { includeNumber = false } = {}) {
  const d = doc.toObject ? doc.toObject() : doc
  const expiryStatus = getExpiryStatus(d.expiryDate)
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
  const token = createSignedDownloadToken(String(d._id), String(d.userId))
  const thumbUrl =
    d.thumbnailUrl && d.storageProvider === "cloudinary"
      ? d.thumbnailUrl
      : d.thumbnailKey || d.mimeType?.startsWith("image/")
        ? `${base}/api/documents/${d._id}/thumbnail?token=${token}`
        : ""
  return {
    id: String(d._id),
    userId: String(d.userId),
    tripId: d.tripId ? String(d.tripId) : null,
    documentType: d.documentType,
    documentTypeLabel: documentTypeLabel(d.documentType),
    title: d.title,
    description: d.description || "",
    country: d.country || "",
    fileUrl: thumbUrl,
    thumbnail: thumbUrl,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    documentNumber: includeNumber && doc.getDocumentNumber ? doc.getDocumentNumber() : d.documentNumberEnc ? "••••••" : "",
    hasDocumentNumber: Boolean(d.documentNumberEnc),
    issueDate: d.issueDate || null,
    expiryDate: d.expiryDate || null,
    expiryStatus,
    issuer: d.issuer || "",
    isPersonal: Boolean(d.isPersonal),
    isFavorite: Boolean(d.isFavorite),
    tags: d.tags || [],
    ocrText: d.ocrText ? d.ocrText.slice(0, 500) : "",
    ocrFields: d.ocrFields || {},
    isEncrypted: Boolean(d.isEncrypted),
    originalFileName: d.originalFileName || "",
    storageProvider: d.storageProvider,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

function buildListFilter(userId, query = {}) {
  const filter = { userId }
  if (query.tripId) filter.tripId = query.tripId
  if (query.documentType) filter.documentType = normalizeDocumentType(query.documentType)
  if (query.favorites === "true" || query.favorites === true) filter.isFavorite = true
  if (query.personal === "true" || query.personal === true) filter.isPersonal = true

  const now = new Date()
  if (query.expired === "true") {
    filter.expiryDate = { $lt: now }
  } else if (query.expiringSoon === "true") {
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    filter.expiryDate = { $gte: now, $lte: in30 }
  }

  const q = String(query.q || query.search || "").trim()
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { country: { $regex: q, $options: "i" } },
      { ocrText: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
      { issuer: { $regex: q, $options: "i" } },
    ]
  }

  return filter
}

export async function listDocuments(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const filter = buildListFilter(userId, query)
  const sort = query.sort === "oldest" ? { createdAt: 1 } : query.sort === "expiry" ? { expiryDate: 1 } : { createdAt: -1 }

  const [rows, total] = await Promise.all([
    TravelDocument.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    TravelDocument.countDocuments(filter),
  ])

  return {
    items: rows.map((d) => serializeDocument(d)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  }
}

export async function searchDocuments(userId, query = {}) {
  return listDocuments(userId, { ...query, q: query.q || query.search })
}

export async function getDocumentById(userId, documentId) {
  const doc = await assertDocumentOwner(userId, documentId)
  return serializeDocument(doc, { includeNumber: true })
}

export async function listTripDocuments(userId, tripId, query = {}) {
  await assertTripAccess(userId, tripId)
  return listDocuments(userId, { ...query, tripId })
}

export async function createDocument(userId, { file, body, req = null }) {
  if (!file?.buffer) throwStatus("File is required")

  const security = enforceFileSecurity({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    size: file.size,
  })
  if (!security.ok) throwStatus(security.errors?.join("; ") || "Upload blocked", 400)

  const validation = {
    valid: true,
    detectedMime: security.detectedMime,
    size: security.size,
  }

  const tripId = body.tripId || null
  if (tripId) await assertTripAccess(userId, tripId)

  const docId = randomUUID()
  const stored = await storeDocumentFile({
    userId,
    docId,
    buffer: file.buffer,
    mimeType: validation.detectedMime,
    originalName: file.originalname,
  })

  const thumb = await storeThumbnail({
    userId,
    docId,
    buffer: file.buffer,
    mimeType: validation.detectedMime,
  })

  const documentType = normalizeDocumentType(body.documentType)
  const title = String(body.title || file.originalname || documentTypeLabel(documentType)).trim().slice(0, 200)
  if (!title) throwStatus("Title is required")

  const ocr = await runDocumentOcr({
    buffer: file.buffer,
    mimeType: validation.detectedMime,
    documentType,
    title,
  })

  const doc = new TravelDocument({
    userId,
    tripId: tripId || null,
    documentType,
    title,
    description: String(body.description || "").trim().slice(0, 2000),
    country: String(body.country || "").trim().slice(0, 120),
    storageProvider: stored.storageProvider,
    storageKey: stored.storageKey,
    fileUrl: stored.fileUrl,
    thumbnailKey: thumb?.thumbnailKey || "",
    thumbnailUrl: thumb?.thumbnailUrl || "",
    mimeType: validation.detectedMime,
    fileSize: validation.size,
    issueDate: body.issueDate ? new Date(body.issueDate) : ocr.ocrFields?.issueDate || null,
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : ocr.ocrFields?.expiryDate || null,
    issuer: String(body.issuer || "").trim().slice(0, 200),
    isPersonal: body.isPersonal === true || body.isPersonal === "true" || !tripId,
    isFavorite: false,
    tags: parseTags(body.tags),
    ocrText: ocr.ocrText || "",
    ocrFields: ocr.ocrFields || {},
    originalFileName: file.originalname,
  })

  const docNum = body.documentNumber || ocr.ocrFields?.passportNumber || ocr.ocrFields?.visaNumber || ""
  if (docNum) doc.setDocumentNumber(docNum)

  await doc.save()
  const serialized = serializeDocument(doc, { includeNumber: true })
  if (req) {
    await auditFileUpload(req, doc).catch(() => {})
  }
  const { publishAsync, DOMAIN_EVENTS } = await import("../../events/index.js")
  publishAsync(
    DOMAIN_EVENTS.DOCUMENT_UPLOADED,
    {
      userId: String(userId),
      tripId: tripId ? String(tripId) : null,
      id: String(doc._id),
      documentType: doc.documentType,
      title: doc.title,
      fileSize: validation.size || doc.fileSize || 0,
      tenantId: doc.tenantId ? String(doc.tenantId) : null,
      skipEventNotification: true,
    },
    { source: "documentService.create", userId: String(userId), dedupeKey: `doc:upload:${doc._id}` },
  )
  return serialized
}

export async function updateDocument(userId, documentId, body) {
  const doc = await assertDocumentOwner(userId, documentId)

  if (body.tripId !== undefined) {
    if (body.tripId) await assertTripAccess(userId, body.tripId)
    doc.tripId = body.tripId || null
  }
  if (body.documentType) doc.documentType = normalizeDocumentType(body.documentType)
  if (body.title) doc.title = String(body.title).trim().slice(0, 200)
  if (body.description !== undefined) doc.description = String(body.description).trim().slice(0, 2000)
  if (body.country !== undefined) doc.country = String(body.country).trim().slice(0, 120)
  if (body.issuer !== undefined) doc.issuer = String(body.issuer).trim().slice(0, 200)
  if (body.issueDate !== undefined) doc.issueDate = body.issueDate ? new Date(body.issueDate) : null
  if (body.expiryDate !== undefined) doc.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null
  if (body.isPersonal !== undefined) doc.isPersonal = body.isPersonal === true || body.isPersonal === "true"
  if (body.isFavorite !== undefined) doc.isFavorite = body.isFavorite === true || body.isFavorite === "true"
  if (body.tags !== undefined) doc.tags = parseTags(body.tags)
  if (body.documentNumber) doc.setDocumentNumber(body.documentNumber)

  await doc.save()
  try {
    const { invalidateDocumentCaches } = await import("../../utils/cacheHelpers.js")
    await invalidateDocumentCaches(userId, doc.tripId)
  } catch {
    /* redis optional */
  }
  return serializeDocument(doc, { includeNumber: true })
}

export async function deleteDocument(userId, documentId) {
  const doc = await assertDocumentOwner(userId, documentId)
  const tripId = doc.tripId
  await deleteDocumentFiles(doc)
  await doc.deleteOne()
  try {
    const { invalidateDocumentCaches } = await import("../../utils/cacheHelpers.js")
    await invalidateDocumentCaches(userId, tripId)
  } catch {
    /* redis optional */
  }
  const { publishAsync, DOMAIN_EVENTS } = await import("../../events/index.js")
  publishAsync(
    DOMAIN_EVENTS.DOCUMENT_DELETED,
    {
      userId: String(userId),
      tripId: tripId ? String(tripId) : null,
      id: String(documentId),
      fileSize: doc.fileSize || 0,
      tenantId: doc.tenantId ? String(doc.tenantId) : null,
    },
    { source: "documentService.delete", userId: String(userId), dedupeKey: `doc:delete:${documentId}` },
  )
  return { id: String(documentId), deleted: true }
}

export async function toggleFavorite(userId, documentId) {
  const doc = await assertDocumentOwner(userId, documentId)
  doc.isFavorite = !doc.isFavorite
  await doc.save()
  return serializeDocument(doc)
}

export async function getDownloadInfo(userId, documentId, signedToken) {
  const doc = await assertDocumentOwner(userId, documentId)
  const cloudUrl = await getSignedDownloadUrl(doc)
  const token = createSignedDownloadToken(documentId, userId)
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
  return {
    downloadUrl: cloudUrl || `${base}/api/documents/${documentId}/file?token=${token}`,
    fileName: doc.originalFileName || doc.title,
    mimeType: doc.mimeType,
    expiresIn: 900,
  }
}

export async function streamDocumentFile(userId, documentId, token) {
  let ownerId = userId
  if (token) {
    const { parseSignedDownloadToken } = await import("../../utils/signedUrl.js")
    const parsed = parseSignedDownloadToken(token, documentId)
    if (!parsed) throwStatus("Invalid or expired download link", 403)
    ownerId = parsed.userId
  } else if (!userId) {
    throwStatus("Download authorization required", 403)
  }

  const doc = await assertDocumentOwner(ownerId, documentId)
  const buffer = await readDocumentFile(doc)
  return { buffer, mimeType: doc.mimeType, fileName: doc.originalFileName || doc.title }
}

export async function streamThumbnail(userId, documentId, token) {
  let ownerId = userId
  if (token) {
    const { parseSignedDownloadToken } = await import("../../utils/signedUrl.js")
    const parsed = parseSignedDownloadToken(token, documentId)
    if (!parsed) throwStatus("Invalid or expired link", 403)
    ownerId = parsed.userId
  } else if (!userId) {
    throwStatus("Authorization required", 403)
  }

  const doc = await assertDocumentOwner(ownerId, documentId)
  if (!doc.thumbnailKey) throwStatus("No thumbnail", 404)
  const { readThumbnailFile } = await import("../storage/index.js")
  const buffer = await readThumbnailFile(doc)
  if (!buffer?.length) throwStatus("No thumbnail", 404)
  return { buffer, mimeType: "image/jpeg" }
}

export async function getExpiryTimeline(userId) {
  const docs = await TravelDocument.find({ userId, expiryDate: { $ne: null } })
    .sort({ expiryDate: 1 })
    .limit(50)
  return docs.map((d) => serializeDocument(d))
}

export async function getMissingDocuments(userId, tripId) {
  const trip = await assertTripAccess(userId, tripId)
  const docs = await TravelDocument.find({ userId, tripId }).lean()
  const present = new Set(docs.map((d) => d.documentType))

  const dest = String(trip.destination || trip.country || "").toLowerCase()
  const isInternational = dest && !dest.includes("india") && !dest.includes("domestic")

  const required = isInternational ? INTERNATIONAL_REQUIRED_TYPES : TRIP_ESSENTIAL_TYPES
  const missing = required.filter((t) => !present.has(t)).map((t) => ({
    documentType: t,
    label: documentTypeLabel(t),
    required: true,
  }))

  const recommended = ["boarding_pass", "vaccination_certificate", "train_ticket"]
    .filter((t) => !present.has(t) && !missing.some((m) => m.documentType === t))
    .map((t) => ({ documentType: t, label: documentTypeLabel(t), required: false }))

  return {
    tripId: String(tripId),
    tripTitle: trip.title,
    destination: trip.destination,
    isInternational,
    present: [...present],
    missing,
    recommended,
    checklist: [...missing, ...recommended],
  }
}

export async function getDocumentsForAi(userId, { tripId, query } = {}) {
  const filter = { userId }
  if (tripId) filter.tripId = tripId
  const q = String(query || "").toLowerCase()
  if (q.includes("passport")) filter.documentType = "passport"
  else if (q.includes("visa")) filter.documentType = "visa"
  else if (q.includes("insurance")) filter.documentType = "travel_insurance"
  else if (q.includes("hotel")) filter.documentType = "hotel_voucher"
  else if (q.includes("flight") || q.includes("ticket")) filter.documentType = { $in: ["flight_ticket", "boarding_pass"] }

  const docs = await TravelDocument.find(filter).sort({ updatedAt: -1 }).limit(30).lean()
  return docs.map((d) => ({
    id: String(d._id),
    type: d.documentType,
    title: d.title,
    country: d.country,
    expiryDate: d.expiryDate,
    issueDate: d.issueDate,
    tripId: d.tripId ? String(d.tripId) : null,
    tags: d.tags,
    ocrSummary: d.ocrText?.slice(0, 300) || "",
    ocrFields: d.ocrFields,
  }))
}

export async function getDocumentStats(userId) {
  const [total, favorites, expiring, expired] = await Promise.all([
    TravelDocument.countDocuments({ userId }),
    TravelDocument.countDocuments({ userId, isFavorite: true }),
    TravelDocument.countDocuments({
      userId,
      expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    }),
    TravelDocument.countDocuments({ userId, expiryDate: { $lt: new Date() } }),
  ])
  return { total, favorites, expiring, expired }
}
