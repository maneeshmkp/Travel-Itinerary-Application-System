import { llmChatJson } from "../aiService.js"
import {
  buildRecommendationId,
  roundMoney,
} from "../../utils/budgetCalculator.js"
import {
  normalizeCategory,
  normalizeDifficulty,
  normalizeImpact,
} from "../../constants/budgetOptimization.js"

function clip(obj) {
  const s = JSON.stringify(obj)
  return s.length > 24000 ? s.slice(0, 24000) + "…" : s
}

function normalizeAiRecommendation(raw) {
  if (!raw || !raw.title) return null
  const cat = normalizeCategory(raw.category || raw.type)
  return {
    id: raw.id || buildRecommendationId(`${cat}-${raw.title}`),
    category: cat,
    title: String(raw.title).slice(0, 300),
    reason: String(raw.reason || raw.description || "").slice(0, 2000),
    estimatedSavings: roundMoney(raw.estimatedSavings || raw.savings || 0),
    impact: normalizeImpact(raw.impact),
    difficulty: normalizeDifficulty(raw.difficulty),
    currentPrice: roundMoney(raw.currentPrice || 0),
    suggestedPrice: roundMoney(raw.suggestedPrice || 0),
    status: "pending",
    affectedDay: raw.affectedDay || raw.dayNumber,
    activityId: raw.activityId || "",
    bookingId: raw.bookingId || "",
    alternative: {
      name: raw.alternative?.name || raw.suggestedName || "",
      location: raw.alternative?.location || "",
      mapsUrl: raw.alternative?.mapsUrl || raw.mapsUrl || "",
    },
    metadata: raw.metadata || {},
  }
}

function demoBudgetAnalysis(ctx, ruleResult = {}) {
  const recs = [...(ruleResult.recommendations || [])]
  if (!recs.length) {
    recs.push({
      id: buildRecommendationId("demo-metro"),
      category: "transport",
      title: "Use public transport instead of taxis",
      reason: "Switching to metro saves money with minimal travel time increase.",
      estimatedSavings: 2500,
      impact: "high",
      difficulty: "easy",
      currentPrice: 5500,
      suggestedPrice: 3000,
      status: "pending",
      alternative: {
        name: "Metro + walking",
        location: ctx.destination,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=metro+${encodeURIComponent(ctx.destination || "")}`,
      },
    })
  }

  const current = ruleResult.currentBudget || ctx.currentBudget || 42000
  const savings = ruleResult.potentialSavings || roundMoney(current * 0.2)
  const optimized = roundMoney(current - savings)

  return {
    demo: true,
    currentBudget: current,
    optimizedBudget: optimized,
    potentialSavings: savings,
    recommendations: recs.slice(0, 12),
    updatedItinerary: [],
    reasoning: ruleResult.reasoning || [
      "Demo mode — add GEMINI_API_KEY for deeper AI optimization.",
      "Rule-based engine found transport and dining savings opportunities.",
    ],
  }
}

export async function analyzeBudgetWithAI(ctx, ruleResult = {}) {
  const system = `You are an expert travel budget optimizer like Google Travel, Hopper, and Kayak.
Analyze the trip and return ONLY valid JSON (no markdown):
{
  "currentBudget": number,
  "optimizedBudget": number,
  "potentialSavings": number,
  "recommendations": [{
    "category": "hotel|transport|food|activity|flight|shopping|misc",
    "title": "string",
    "reason": "why this saves money while keeping experience quality",
    "estimatedSavings": number,
    "impact": "low|medium|high",
    "difficulty": "easy|medium|hard",
    "currentPrice": number,
    "suggestedPrice": number,
    "affectedDay": 1,
    "activityId": "optional",
    "alternative": { "name": "string", "location": "string", "mapsUrl": "string" }
  }],
  "updatedItinerary": [{
    "dayNumber": 1,
    "changes": [{ "action": "replace|move|remove", "from": "string", "to": "string", "savings": number }]
  }],
  "reasoning": ["short explanation strings"]
}
Suggest: cheaper hotels, metro vs taxi, local restaurants, free attractions, museum free-entry days, walking routes, public beaches.
Every recommendation must include reason, estimatedSavings, impact, difficulty.
Merge with rule-based suggestions — do not duplicate. Never return plain text outside JSON.`

  const user = `Trip context:\n${clip({
    destination: ctx.destination,
    totalDays: ctx.totalDays,
    tags: ctx.tags,
    budget: ctx.budget,
    expenseReport: {
      budget: ctx.expenseReport?.budget,
      byCategory: ctx.expenseReport?.byCategory,
      insights: ctx.expenseReport?.insights,
    },
    bookings: (ctx.bookings || []).map((b) => ({
      type: b.bookingType,
      provider: b.provider,
      price: b.price,
      flightNumber: b.flightNumber,
    })),
    activities: (ctx.activities || []).slice(0, 40).map((a) => ({
      name: a.name,
      category: a.category,
      cost: a.cost,
      dayNumber: a.dayNumber,
      location: a.location,
    })),
    weatherSummary: ctx.weatherSummary,
    ruleRecommendations: (ruleResult.recommendations || []).slice(0, 8).map((r) => ({
      title: r.title,
      savings: r.estimatedSavings,
    })),
    nearbyHints: ctx.nearbyHints,
  })}`

  const { demo, parsed } = await llmChatJson({ system, user })

  if (demo || !parsed) {
    return demoBudgetAnalysis(ctx, ruleResult)
  }

  const aiRecs = (parsed.recommendations || [])
    .map(normalizeAiRecommendation)
    .filter(Boolean)

  const ruleRecs = ruleResult.recommendations || []
  const merged = [...ruleRecs]
  const seen = new Set(ruleRecs.map((r) => r.title.toLowerCase()))
  for (const r of aiRecs) {
    if (seen.has(r.title.toLowerCase())) continue
    seen.add(r.title.toLowerCase())
    merged.push(r)
  }

  const currentBudget = roundMoney(parsed.currentBudget ?? ruleResult.currentBudget ?? ctx.currentBudget ?? 0)
  const potentialSavings = roundMoney(
    parsed.potentialSavings ?? merged.reduce((s, r) => s + r.estimatedSavings, 0) * 0.6,
  )
  const optimizedBudget = roundMoney(
    parsed.optimizedBudget ?? Math.max(0, currentBudget - potentialSavings),
  )

  return {
    demo: false,
    currentBudget,
    optimizedBudget,
    potentialSavings: roundMoney(currentBudget - optimizedBudget) || potentialSavings,
    recommendations: merged.slice(0, 15),
    updatedItinerary: parsed.updatedItinerary || [],
    reasoning: parsed.reasoning || ruleResult.reasoning || [],
  }
}
