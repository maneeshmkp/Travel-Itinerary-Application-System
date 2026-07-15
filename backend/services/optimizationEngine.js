import {
  buildRecommendationId,
  roundMoney,
} from "../utils/budgetCalculator.js"
import {
  normalizeCategory,
  normalizeDifficulty,
  normalizeImpact,
} from "../constants/budgetOptimization.js"
import { buildPriceComparisons } from "./priceComparison.js"

function createRecommendation({
  category,
  title,
  reason,
  estimatedSavings,
  impact,
  difficulty,
  currentPrice,
  suggestedPrice,
  affectedDay,
  activityId,
  bookingId,
  alternative,
  metadata,
}) {
  const cat = normalizeCategory(category)
  return {
    id: buildRecommendationId(`${cat}-${title}-${affectedDay || ""}`),
    category: cat,
    title: String(title || "Save on trip costs").slice(0, 300),
    reason: String(reason || "").slice(0, 2000),
    estimatedSavings: roundMoney(estimatedSavings || 0),
    impact: normalizeImpact(impact),
    difficulty: normalizeDifficulty(difficulty),
    currentPrice: roundMoney(currentPrice || 0),
    suggestedPrice: roundMoney(suggestedPrice || 0),
    status: "pending",
    affectedDay: affectedDay ? Number(affectedDay) : undefined,
    activityId: activityId || "",
    bookingId: bookingId || "",
    alternative: alternative || {},
    metadata: metadata || {},
  }
}

/**
 * Rule-based optimization before AI merge — mirrors risk detection pattern.
 */
export function runRuleBasedOptimization(ctx = {}) {
  const recommendations = []
  const expense = ctx.expenseReport || {}
  const budget = expense.budget || {}
  const currency = expense.currency || ctx.currency || "INR"
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `

  if (budget.overBudget || (budget.percentUsed != null && budget.percentUsed >= 85)) {
    recommendations.push(
      createRecommendation({
        category: "misc",
        title: "Reduce spending on remaining days",
        reason: `You've used ${Math.round(budget.percentUsed || 100)}% of your budget. Prioritize free attractions and budget dining.`,
        estimatedSavings: roundMoney(budget.exceededBy || budget.planned * 0.1),
        impact: "high",
        difficulty: "medium",
        currentPrice: budget.actual,
        suggestedPrice: budget.planned,
      }),
    )
  }

  const comparisons = buildPriceComparisons(ctx)
  for (const cmp of comparisons.slice(0, 8)) {
    recommendations.push(
      createRecommendation({
        category: cmp.type,
        title: `Switch from ${cmp.currentName} to ${cmp.suggestedName}`,
        reason: `Save ${sym}${cmp.savings} with a comparable experience.`,
        estimatedSavings: cmp.savings,
        impact: cmp.savings > 2000 ? "high" : cmp.savings > 800 ? "medium" : "low",
        difficulty: cmp.type === "transport" ? "easy" : "medium",
        currentPrice: cmp.currentPrice,
        suggestedPrice: cmp.suggestedPrice,
        affectedDay: cmp.affectedDay,
        activityId: cmp.activityId,
        bookingId: cmp.bookingId,
        alternative: {
          name: cmp.suggestedName,
          location: ctx.destination,
          mapsUrl: cmp.mapsUrl,
        },
      }),
    )
  }

  const rainDays = (ctx.weatherForecast || []).filter((d) =>
    String(d.condition || "").toLowerCase().includes("rain"),
  )
  if (rainDays.length > 0) {
    const outdoor = (ctx.activities || []).filter(
      (a) => !a.skipped && ["relaxation", "adventure"].includes(a.category) && Number(a.cost) > 0,
    )
    for (const act of outdoor.slice(0, 2)) {
      recommendations.push(
        createRecommendation({
          category: "activity",
          title: `Move ${act.name} indoors on rainy day`,
          reason: "Rain forecast — swap beach/outdoor plans for museum, mall, or aquarium.",
          estimatedSavings: roundMoney(Number(act.cost) * 0.3),
          impact: "medium",
          difficulty: "easy",
          currentPrice: Number(act.cost),
          suggestedPrice: roundMoney(Number(act.cost) * 0.7),
          affectedDay: act.dayNumber,
          activityId: String(act._id || act.id || ""),
          alternative: {
            name: "Indoor museum or shopping mall",
            location: ctx.destination,
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=museum+${encodeURIComponent(ctx.destination)}`,
          },
        }),
      )
    }
  }

  const transportCat = (expense.byCategory || []).find((c) => c.id === "transport")
  if (transportCat && transportCat.planned > 800) {
    recommendations.push(
      createRecommendation({
        category: "transport",
        title: "Use metro instead of taxi",
        reason: `Switching to public transport saves ${sym}${roundMoney(transportCat.planned * 0.45)} with minimal increase in travel time.`,
        estimatedSavings: roundMoney(transportCat.planned * 0.45),
        impact: "high",
        difficulty: "easy",
        currentPrice: transportCat.planned,
        suggestedPrice: roundMoney(transportCat.planned * 0.55),
        alternative: {
          name: "Metro / bus",
          location: ctx.destination,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=metro+station+${encodeURIComponent(ctx.destination)}`,
        },
      }),
    )
  }

  const hotelBooking = (ctx.bookings || []).find((b) => b.bookingType === "hotel" && Number(b.price) > 0)
  if (hotelBooking) {
    const price = Number(hotelBooking.price)
    const savings = roundMoney(price * 0.22)
    recommendations.push(
      createRecommendation({
        category: "hotel",
        title: `Choose a budget hotel instead of ${hotelBooking.provider || "current stay"}`,
        reason: "Nearby 3-star options offer similar amenities at lower nightly rates.",
        estimatedSavings: savings,
        impact: "high",
        difficulty: "medium",
        currentPrice: price,
        suggestedPrice: roundMoney(price - savings),
        bookingId: String(hotelBooking._id),
        alternative: {
          name: "Budget hotel nearby",
          location: ctx.destination,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=budget+hotels+${encodeURIComponent(ctx.destination)}`,
        },
      }),
    )
  }

  const deduped = []
  const seen = new Set()
  for (const r of recommendations) {
    const key = `${r.category}-${r.title}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(r)
  }

  const totalSavings = roundMoney(deduped.reduce((s, r) => s + r.estimatedSavings, 0))
  const currentBudget = roundMoney(budget.planned || ctx.currentBudget || 0)
  const optimizedBudget = roundMoney(Math.max(0, currentBudget - totalSavings * 0.65))

  return {
    recommendations: deduped,
    comparisons,
    currentBudget,
    optimizedBudget,
    potentialSavings: roundMoney(currentBudget - optimizedBudget),
    reasoning: [
      "Rule engine analyzed hotels, transport, dining, activities, and weather.",
      budget.overBudget ? "Budget exceeded — prioritize high-impact savings." : "Room to optimize without sacrificing core experiences.",
    ],
  }
}
