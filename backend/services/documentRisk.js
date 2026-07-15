import { createRiskItem } from "../utils/riskHelpers.js"
import { documentTypeLabel } from "../constants/documentTypes.js"

export function detectDocumentRisks(missingDocs = {}, documents = []) {
  const risks = []
  const missing = missingDocs?.missing || []
  const present = missingDocs?.present || []

  for (const type of missing) {
    risks.push(
      createRiskItem({
        riskType: "missing_documents",
        severity: missingDocs?.isInternational ? "HIGH" : "MEDIUM",
        title: `Missing ${documentTypeLabel(type)}`,
        description: `${documentTypeLabel(type)} not found in your travel vault for this trip.`,
        source: "document",
        recommendation: {
          title: "Upload required document",
          suggestions: [
            `Add your ${documentTypeLabel(type).toLowerCase()} to the document vault`,
            "Keep digital and printed copies accessible offline",
          ],
        },
        metadata: { documentType: type },
      }),
    )
  }

  const now = new Date()
  const sixMonths = 180 * 24 * 60 * 60 * 1000
  const thirtyDays = 30 * 24 * 60 * 60 * 1000

  for (const doc of documents || []) {
    if (!doc.expiryDate) continue
    const expiry = new Date(doc.expiryDate)
    if (Number.isNaN(expiry.getTime())) continue
    const ms = expiry - now

    if (doc.documentType === "passport" && ms > 0 && ms <= sixMonths) {
      risks.push(
        createRiskItem({
          riskType: "passport_expiring",
          severity: ms <= thirtyDays ? "HIGH" : "MEDIUM",
          title: "Passport expires soon",
          description: `Passport expires on ${expiry.toISOString().slice(0, 10)} — may affect international travel.`,
          source: "document",
          recommendation: {
            title: "Renew passport before departure",
            suggestions: [
              "Check destination entry requirements (6-month validity rule)",
              "Apply for renewal immediately if within 30 days of expiry",
            ],
          },
          metadata: { documentId: doc.id || doc._id, expiryDate: doc.expiryDate },
        }),
      )
    }

    if (doc.documentType === "visa" && ms > 0 && ms <= thirtyDays) {
      risks.push(
        createRiskItem({
          riskType: "visa_expiring",
          severity: "HIGH",
          title: "Visa expires before or during trip",
          description: `Visa expires on ${expiry.toISOString().slice(0, 10)}.`,
          source: "document",
          recommendation: {
            suggestions: ["Apply for visa extension or re-issue", "Confirm return date is before visa expiry"],
          },
          metadata: { documentId: doc.id || doc._id, expiryDate: doc.expiryDate },
        }),
      )
    }
  }

  if (missingDocs?.isInternational && !present.includes("travel_insurance") && !missing.includes("travel_insurance")) {
    // insurance not in missing list but also not present - covered by missing check
  }

  return risks
}
