import TravelDocument from "../models/TravelDocument.js"
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js"
import { documentTypeLabel } from "../constants/documentTypes.js"
import { notifyDocumentExpiry } from "./notifications/notificationTriggers.js"

const REMINDER_WINDOWS = [
  { type: "passport", days: 180, label: "6 months", priority: "HIGH" },
  { type: "visa", days: 30, label: "30 days", priority: "HIGH" },
  { type: "travel_insurance", days: 1, label: "tomorrow", priority: "MEDIUM" },
  { type: "driving_license", days: 30, label: "30 days", priority: "MEDIUM" },
  { type: "vaccination_certificate", days: 30, label: "30 days", priority: "LOW" },
]

function daysUntil(date, now = new Date()) {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d - now) / (24 * 60 * 60 * 1000))
}

export async function runDocumentExpiryReminders(now = new Date()) {
  const docs = await TravelDocument.find({
    expiryDate: { $exists: true, $ne: null },
  })
    .select("userId tripId documentType title expiryDate")
    .lean()

  let count = 0
  for (const doc of docs) {
    const days = daysUntil(doc.expiryDate, now)
    if (days === null || days < 0) continue

    const window = REMINDER_WINDOWS.find((w) => w.type === doc.documentType)
    if (!window) continue
    if (days > window.days) continue

    const label = documentTypeLabel(doc.documentType)
    const expiryStr = new Date(doc.expiryDate).toLocaleDateString()
    const message =
      days <= 1
        ? `Your ${label} "${doc.title}" expires tomorrow (${expiryStr}).`
        : `Your ${label} "${doc.title}" expires in ${days} day(s) (${expiryStr}).`

    const n = await notifyDocumentExpiry(doc.userId, {
      tripId: doc.tripId,
      documentId: doc._id,
      type: NOTIFICATION_TYPES.DOCUMENT_EXPIRING,
      title: `${label} expiring soon`,
      message,
      dedupKey: `doc-expiry-${doc._id}-${expiryStr}`,
      priority: window.priority,
    })
    if (n) count += 1
  }
  return count
}

export function getExpiryStatus(expiryDate, now = new Date()) {
  const days = daysUntil(expiryDate, now)
  if (days === null) return "unknown"
  if (days < 0) return "expired"
  if (days <= 30) return "expiring_soon"
  return "valid"
}
