import { randomUUID } from "crypto"
import {
  normalizeRiskType,
  normalizeSeverity,
  severityRank,
  HEALTH_LABELS,
  RISK_SEVERITIES,
} from "../constants/riskTypes.js"

export function throwStatus(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

export function buildRiskDedupKey({ riskType, affectedDay, title }) {
  const day = affectedDay ? `d${affectedDay}` : "all"
  const slug = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
  return `${normalizeRiskType(riskType)}-${day}-${slug}`
}

export function createRiskItem({
  riskType,
  severity,
  title,
  description,
  recommendation,
  affectedDay,
  affectedActivityIds,
  source,
  metadata,
  dedupKey,
}) {
  return {
    riskType: normalizeRiskType(riskType),
    severity: normalizeSeverity(severity),
    title: String(title || "Travel risk").trim().slice(0, 300),
    description: String(description || "").trim().slice(0, 2000),
    recommendation: {
      title: recommendation?.title || "",
      description: recommendation?.description || "",
      suggestions: (recommendation?.suggestions || []).map(String).slice(0, 8),
      alternativeActivities: (recommendation?.alternativeActivities || []).slice(0, 6),
      transportTip: recommendation?.transportTip || "",
    },
    affectedDay: affectedDay ? Number(affectedDay) : undefined,
    affectedActivityIds: (affectedActivityIds || []).map(String),
    source: source || "ai",
    metadata: metadata || {},
    dedupKey: dedupKey || buildRiskDedupKey({ riskType, affectedDay, title }),
  }
}

export function computeHealthScore(openRisks = [], factors = {}) {
  let score = 100
  for (const risk of openRisks) {
    const sev = normalizeSeverity(risk.severity)
    if (sev === "CRITICAL") score -= 25
    else if (sev === "HIGH") score -= 15
    else if (sev === "MEDIUM") score -= 8
    else score -= 3
  }

  if (factors.budgetExceeded) score -= 12
  if (factors.missingDocuments) score -= 10
  if (factors.weatherAlerts) score -= 8
  if (factors.scheduleConflicts) score -= 10

  score = Math.max(0, Math.min(100, Math.round(score)))

  let label = HEALTH_LABELS.poor
  if (score >= 85) label = HEALTH_LABELS.excellent
  else if (score >= 70) label = HEALTH_LABELS.good
  else if (score >= 50) label = HEALTH_LABELS.average

  return { score, label }
}

export function overallSeverity(risks = []) {
  const open = risks.filter((r) => r.status === "OPEN")
  if (!open.length) return "LOW"
  let max = 0
  for (const r of open) max = Math.max(max, severityRank(r.severity))
  return RISK_SEVERITIES[max - 1] || "LOW"
}

export function collectRecommendations(risks = []) {
  const out = []
  for (const risk of risks.filter((r) => r.status === "OPEN")) {
    const rec = risk.recommendation
    if (!rec) continue
    if (rec.title || rec.description) {
      out.push({
        riskId: risk.id || risk._id,
        riskType: risk.riskType,
        severity: risk.severity,
        title: rec.title || risk.title,
        description: rec.description || risk.description,
        suggestions: rec.suggestions || [],
        affectedDay: risk.affectedDay,
      })
    }
  }
  return out.slice(0, 15)
}

export function serializeTripRisk(doc) {
  const d = doc.toObject ? doc.toObject() : doc
  return {
    id: String(d._id),
    tripId: String(d.tripId),
    userId: String(d.userId),
    riskType: d.riskType,
    severity: d.severity,
    status: d.status,
    title: d.title,
    description: d.description,
    recommendation: d.recommendation || {},
    affectedDay: d.affectedDay,
    affectedActivityIds: d.affectedActivityIds || [],
    source: d.source,
    metadata: d.metadata || {},
    analyzedAt: d.analyzedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function buildAnalysisHash(ctx) {
  const key = JSON.stringify({
    destination: ctx.destination,
    days: ctx.totalDays,
    startDate: ctx.startDate,
    weather: ctx.weatherSummary,
    bookings: (ctx.bookings || []).length,
    missingDocs: (ctx.missingDocuments?.missing || []).length,
    budget: ctx.budgetSummary?.percentUsed,
    activities: (ctx.activities || []).slice(0, 30).map((a) => `${a.dayNumber}-${a.name}`),
  })
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return `risk-${hash.toString(16)}`
}

export function collectActivities(trip) {
  const activities = []
  for (const day of trip.days || []) {
    for (const act of day.activities || []) {
      if (!act?.skipped) {
        activities.push({
          ...act,
          dayNumber: day.dayNumber,
          dayLabel: day.dayLabel,
          dayId: String(day._id),
        })
      }
    }
  }
  return activities
}

export function newRiskId() {
  return randomUUID()
}
