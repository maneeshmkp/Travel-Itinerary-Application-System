import { createHash } from "crypto"
import { roundMoney } from "./expenseCalculations.js"
import { BUDGET_HEALTH_LABELS, normalizeCategory } from "../constants/budgetOptimization.js"

export { roundMoney }

export function buildRecommendationId(seed = "") {
  return createHash("sha256").update(String(seed)).digest("hex").slice(0, 12)
}

export function buildAnalysisHash(ctx) {
  const payload = {
    destination: ctx.destination,
    budget: ctx.budget,
    expenseTotals: ctx.expenseReport?.budget,
    activityCount: ctx.activities?.length,
    bookingCount: ctx.bookings?.length,
    tags: ctx.tags,
  }
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
}

/**
 * Budget health 0–100 based on usage, category balance, luxury ratio, free activities, transport share.
 */
export function computeBudgetHealthScore({
  percentUsed = 0,
  overBudget = false,
  byCategory = [],
  activities = [],
  transportShare = 0,
  freeActivityRatio = 0,
} = {}) {
  let score = 100

  if (overBudget) score -= 25
  else if (percentUsed >= 100) score -= 20
  else if (percentUsed >= 90) score -= 12
  else if (percentUsed >= 80) score -= 6

  const overCategories = byCategory.filter((c) => c.actual > c.planned && c.planned > 0).length
  score -= Math.min(15, overCategories * 4)

  if (transportShare > 0.35) score -= 10
  else if (transportShare > 0.25) score -= 5

  if (freeActivityRatio < 0.1) score -= 8
  else if (freeActivityRatio >= 0.3) score += 5

  const luxurySpend = byCategory
    .filter((c) => ["shopping", "entertainment"].includes(c.id))
    .reduce((s, c) => s + (c.planned || c.current || 0), 0)
  const totalPlanned = byCategory.reduce((s, c) => s + (c.planned || c.current || 0), 0)
  if (totalPlanned > 0 && luxurySpend / totalPlanned > 0.25) score -= 8

  score = Math.max(0, Math.min(100, Math.round(score)))

  let label = BUDGET_HEALTH_LABELS.poor
  if (score >= 85) label = BUDGET_HEALTH_LABELS.excellent
  else if (score >= 70) label = BUDGET_HEALTH_LABELS.good
  else if (score >= 50) label = BUDGET_HEALTH_LABELS.average

  return { score, label }
}

export function buildCategoryBreakdown(expenseByCategory = [], savingsByCategory = {}) {
  const categoryMap = {
    hotel: "hotel",
    transport: "transport",
    food: "food",
    activity: "activity",
    tickets: "flight",
    shopping: "shopping",
    misc: "misc",
    entertainment: "activity",
    health: "misc",
    fuel: "transport",
    tips: "misc",
    insurance: "misc",
  }

  const buckets = {}
  for (const row of expenseByCategory) {
    const bucket = categoryMap[row.id] || "misc"
    if (!buckets[bucket]) buckets[bucket] = { category: bucket, current: 0, optimized: 0, savings: 0 }
    buckets[bucket].current = roundMoney(buckets[bucket].current + (row.planned || row.actual || 0))
  }

  for (const [cat, savings] of Object.entries(savingsByCategory)) {
    const bucket = normalizeCategory(cat)
    if (!buckets[bucket]) buckets[bucket] = { category: bucket, current: 0, optimized: 0, savings: 0 }
    buckets[bucket].savings = roundMoney(buckets[bucket].savings + savings)
    buckets[bucket].optimized = roundMoney(Math.max(0, buckets[bucket].current - buckets[bucket].savings))
  }

  for (const b of Object.values(buckets)) {
    if (!b.optimized && b.current) b.optimized = roundMoney(Math.max(0, b.current - b.savings))
  }

  return Object.values(buckets)
}

export function sumRecommendationSavings(recommendations = [], { status = "pending" } = {}) {
  return roundMoney(
    recommendations
      .filter((r) => !status || r.status === status)
      .reduce((s, r) => s + Number(r.estimatedSavings || 0), 0),
  )
}

export function buildOptimizationCharts({ currentBudget, optimizedBudget, potentialSavings, categoryBreakdown = [] }) {
  return {
    comparison: [
      { name: "Current", amount: currentBudget },
      { name: "Optimized", amount: optimizedBudget },
      { name: "Savings", amount: potentialSavings },
    ],
    category: categoryBreakdown.map((c) => ({
      category: c.category,
      current: c.current,
      optimized: c.optimized,
      savings: c.savings,
    })),
    forecast: [
      { label: "Planned", value: currentBudget },
      { label: "After optimization", value: optimizedBudget },
    ],
  }
}

export function serializeBudgetOptimization(doc) {
  if (!doc) return null
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc
  return {
    id: String(o._id),
    tripId: String(o.tripId),
    currency: o.currency,
    currentBudget: o.currentBudget,
    optimizedBudget: o.optimizedBudget,
    potentialSavings: o.potentialSavings,
    plannedBudget: o.plannedBudget,
    actualSpent: o.actualSpent,
    healthScore: o.healthScore,
    healthLabel: o.healthLabel,
    recommendations: (o.recommendations || []).map((r) => ({ ...r })),
    acceptedRecommendations: o.acceptedRecommendations || [],
    comparisons: o.comparisons || [],
    categoryBreakdown: o.categoryBreakdown || [],
    updatedItinerary: o.updatedItinerary || [],
    charts: o.charts || {},
    reasoning: o.reasoning || [],
    demo: Boolean(o.demo),
    generatedByAI: Boolean(o.generatedByAI),
    analyzedAt: o.analyzedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}
