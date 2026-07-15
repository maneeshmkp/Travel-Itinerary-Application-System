import { llmChatJson } from "../aiService.js"
import { createRiskItem, buildRiskDedupKey } from "../../utils/riskHelpers.js"
import { normalizeRiskType, normalizeSeverity } from "../../constants/riskTypes.js"

function clip(obj) {
  const s = JSON.stringify(obj)
  return s.length > 22000 ? s.slice(0, 22000) + "…" : s
}

function normalizeAiRisk(raw) {
  if (!raw || !raw.title) return null
  return createRiskItem({
    riskType: normalizeRiskType(raw.riskType || raw.type),
    severity: normalizeSeverity(raw.severity),
    title: raw.title,
    description: raw.description || "",
    affectedDay: raw.affectedDay || raw.dayNumber,
    source: "ai",
    recommendation: {
      title: raw.recommendation?.title || raw.mitigation || "",
      description: raw.recommendation?.description || "",
      suggestions: raw.recommendation?.suggestions || raw.suggestions || [],
      alternativeActivities: raw.recommendation?.alternativeActivities || raw.alternativeActivities || [],
      transportTip: raw.recommendation?.transportTip || raw.transportTip || "",
    },
    dedupKey: raw.dedupKey || buildRiskDedupKey({ riskType: raw.riskType, affectedDay: raw.affectedDay, title: raw.title }),
    metadata: raw.metadata || {},
  })
}

function demoAiAnalysis(ctx, ruleRisks = []) {
  const risks = [...ruleRisks]
  const insights = []

  if (ctx.weatherSummary?.rainDays >= 1) {
    insights.push("Rain expected — consider indoor alternatives for affected days.")
  }
  if (ctx.missingDocuments?.missing?.length) {
    insights.push(`Missing documents: ${ctx.missingDocuments.missing.join(", ")}`)
  }
  if (ctx.budgetSummary?.budget?.overBudget) {
    insights.push("Budget exceeded — switch to public transport and free attractions.")
  }

  if (!risks.length) {
    risks.push(
      createRiskItem({
        riskType: "general",
        severity: "LOW",
        title: "Trip looks manageable",
        description: "No critical risks detected in demo mode. Add GEMINI_API_KEY for deeper AI analysis.",
        source: "ai",
        recommendation: {
          suggestions: ["Re-run analysis before departure", "Keep documents and bookings updated"],
        },
      }),
    )
  }

  return {
    demo: true,
    risks,
    severity: risks.some((r) => r.severity === "HIGH" || r.severity === "CRITICAL") ? "HIGH" : "LOW",
    recommendations: risks.map((r) => ({
      title: r.recommendation?.title || r.title,
      description: r.recommendation?.description || r.description,
      affectedDay: r.affectedDay,
    })),
    updatedSchedule: [],
    reasoning: insights.length ? insights : ["Demo analysis based on rule-based detectors."],
  }
}

export async function analyzeRisksWithAI(ctx, ruleRisks = []) {
  const system = `You are an expert travel risk analyst like Google Travel + TripIt.
Analyze the trip context and return ONLY valid JSON (no markdown):
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "risks": [{
    "riskType": "heavy_rain|storm|flight_delay|budget_exceeded|overlapping_activities|...",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "title": "string",
    "description": "string",
    "affectedDay": 1,
    "recommendation": {
      "title": "string",
      "description": "string",
      "suggestions": ["string"],
      "alternativeActivities": [{"name":"string","time":"HH:MM","location":"string","category":"string","reason":"string"}],
      "transportTip": "string"
    }
  }],
  "recommendations": [{"title":"string","description":"string","affectedDay":1}],
  "updatedSchedule": [{"dayNumber":1,"activities":[{"name":"string","time":"HH:MM","location":"string","category":"string","reason":"why moved"}]}],
  "reasoning": ["short explanation strings"]
}
Focus on actionable risks: weather, bookings, schedule conflicts, budget, documents, safety.
Merge with existing rule-based risks — do not duplicate. Suggest indoor alternatives when rain.
Never return plain text outside JSON.`

  const user = `Analyze this trip for risks.
Existing rule-based risks (merge/enhance, avoid duplicates):
${clip({ existing: ruleRisks.map((r) => ({ riskType: r.riskType, title: r.title, severity: r.severity })) })}

Full context:
${clip(ctx)}`

  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed && typeof parsed === "object") {
    const aiRisks = (parsed.risks || []).map(normalizeAiRisk).filter(Boolean)
    const merged = mergeRisks(ruleRisks, aiRisks)
    return {
      demo: false,
      risks: merged,
      severity: parsed.severity || "MEDIUM",
      recommendations: parsed.recommendations || [],
      updatedSchedule: parsed.updatedSchedule || [],
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String).slice(0, 10) : [],
    }
  }

  return demoAiAnalysis(ctx, ruleRisks)
}

function mergeRisks(ruleRisks, aiRisks) {
  const map = new Map()
  for (const r of ruleRisks) map.set(r.dedupKey, r)
  for (const r of aiRisks) {
    if (!map.has(r.dedupKey)) map.set(r.dedupKey, r)
    else {
      const existing = map.get(r.dedupKey)
      map.set(r.dedupKey, {
        ...existing,
        description: r.description || existing.description,
        severity: r.severity || existing.severity,
        recommendation: {
          ...existing.recommendation,
          ...r.recommendation,
          suggestions: [...new Set([...(existing.recommendation?.suggestions || []), ...(r.recommendation?.suggestions || [])])].slice(0, 8),
        },
      })
    }
  }
  return [...map.values()]
}

export async function replanDayWithAI({ trip, dayNumber, risk, weatherContext }) {
  const day = (trip.days || []).find((d) => Number(d.dayNumber) === Number(dayNumber))
  if (!day) return { demo: true, updatedSchedule: [], reasoning: ["Day not found"] }

  const system = `You replan ONE day of a trip due to a travel risk. Return ONLY JSON:
{
  "severity": "LOW|MEDIUM|HIGH",
  "updatedSchedule": [{
    "dayNumber": ${dayNumber},
    "activities": [{"name":"string","time":"HH:MM","location":"string","category":"string","duration":"string","reason":"why this change"}]
  }],
  "recommendations": [{"title":"string","description":"string"}],
  "reasoning": ["why you made these changes"]
}
Do NOT regenerate the whole trip — only the affected day. Keep hotel and logical pacing.`

  const user = clip({
    destination: trip.destination,
    dayNumber,
    dayLabel: day.dayLabel,
    hotel: day.hotel,
    risk: { title: risk?.title, description: risk?.description, riskType: risk?.riskType },
    weather: weatherContext,
    currentActivities: (day.activities || []).filter((a) => !a.skipped).map((a) => ({
      name: a.name,
      time: a.time,
      location: a.location,
      category: a.category,
    })),
  })

  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed) {
    return {
      demo: false,
      severity: parsed.severity || "MEDIUM",
      updatedSchedule: parsed.updatedSchedule || [],
      recommendations: parsed.recommendations || [],
      reasoning: parsed.reasoning || [],
    }
  }

  return {
    demo: true,
    updatedSchedule: [
      {
        dayNumber,
        activities: [
          {
            name: "Indoor cultural visit",
            time: "10:00",
            location: trip.destination,
            category: "cultural",
            duration: "2 hours",
            reason: "Weather-safe alternative (demo)",
          },
        ],
      },
    ],
    recommendations: [{ title: "Demo replan", description: "Add API key for AI day replanning." }],
    reasoning: ["Demo mode — rule-based indoor fallback."],
  }
}
