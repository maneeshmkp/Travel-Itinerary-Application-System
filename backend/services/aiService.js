/**
 * LLM-backed JSON responses: prefers Google Gemini (GEMINI_API_KEY), then OpenAI (OPENAI_API_KEY), else demo mode.
 */

import { ITINERARY_TAG_OPTIONS } from "../constants/itineraryTags.js"
import { logAi } from "../logger/index.js"
import { recordDomainEvent } from "./monitoring/metricsStore.js"

const MAX_PAYLOAD_CHARS = 28000
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
/** Cost-efficient stable model; avoids deprecated 2.0 Flash and heavier default quotas. */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"
const GEMINI_429_MAX_RETRIES = 2
/** Tried in order when the primary model is overloaded (high demand / 503). */
const GEMINI_OVERLOAD_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-8b"]
const GEMINI_REQUEST_TIMEOUT_MS = 45_000
const OPENAI_REQUEST_TIMEOUT_MS = 45_000

function clipJsonForPrompt(obj) {
  const s = JSON.stringify(obj)
  if (s.length <= MAX_PAYLOAD_CHARS) return s
  return s.slice(0, MAX_PAYLOAD_CHARS) + "\n…[truncated]"
}

function throwHttpError(message, clientStatus = 503) {
  const err = new Error(message)
  err.clientStatus = clientStatus
  return err
}

/**
 * @returns {{ message: string, clientStatus: number }}
 */
function formatOpenAiHttpError(rawText, httpStatus) {
  let code = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    code = j?.error?.code || ""
    apiMessage = String(j?.error?.message || "").trim()
  } catch {
    return {
      message:
        httpStatus === 429
          ? "The AI service is busy. Please wait a moment and try again."
          : "AI request failed. Please try again.",
      clientStatus: httpStatus === 429 ? 429 : 503,
    }
  }

  if (code === "insufficient_quota" || /quota|billing/i.test(apiMessage)) {
    return {
      message:
        "OpenAI usage limit reached. Add billing at platform.openai.com or switch to GEMINI_API_KEY in backend/.env.",
      clientStatus: 429,
    }
  }
  if (code === "invalid_api_key" || code === "incorrect_api_key") {
    return {
      message: "OpenAI rejected your API key. Check OPENAI_API_KEY in backend/.env.",
      clientStatus: 502,
    }
  }
  if (code === "rate_limit_exceeded" || httpStatus === 429) {
    return {
      message: "Too many AI requests. Please wait a minute and try again.",
      clientStatus: 429,
    }
  }
  if (code === "context_length_exceeded") {
    return {
      message: "Itinerary is too large for one AI request. Try fewer days or shorter text, then try again.",
      clientStatus: 400,
    }
  }

  const short = apiMessage ? apiMessage.slice(0, 220) + (apiMessage.length > 220 ? "…" : "") : ""
  return {
    message: short || "AI request failed. Please try again later.",
    clientStatus: httpStatus >= 400 && httpStatus < 600 ? httpStatus : 503,
  }
}

/**
 * Google Generative Language API error shape.
 * @returns {{ message: string, clientStatus: number }}
 */
function formatGeminiHttpError(rawText, httpStatus) {
  let status = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    status = j?.error?.status || ""
    apiMessage = String(j?.error?.message || "").trim()
  } catch {
    return {
      message: "Google AI request failed. Check GEMINI_API_KEY and model name, then try again.",
      clientStatus: httpStatus === 429 ? 429 : 503,
    }
  }

  if (/API key not valid|invalid argument|PERMISSION_DENIED|API_KEY_INVALID/i.test(apiMessage + status)) {
    return {
      message:
        "Google AI rejected the request. Verify GEMINI_API_KEY in backend/.env (Google AI Studio) and restart the server.",
      clientStatus: 502,
    }
  }
  if (/RESOURCE_EXHAUSTED|quota|429|rate/i.test(status + apiMessage) || httpStatus === 429) {
    return {
      message:
        "Google AI quota or rate limit reached. Wait a bit, check billing/quotas in Google AI Studio, or try a lighter model via GEMINI_MODEL.",
      clientStatus: 429,
    }
  }
  if (/high demand|overloaded|UNAVAILABLE|temporarily unavailable/i.test(apiMessage + status) || httpStatus === 503) {
    return {
      message: "The AI service is busy right now. Please wait a moment and try again.",
      clientStatus: 503,
    }
  }
  if (/SAFETY|blocked|blockReason/i.test(apiMessage)) {
    return {
      message: "The AI blocked this request for safety. Rephrase destination or shorten the itinerary and try again.",
      clientStatus: 400,
    }
  }

  const short = apiMessage ? apiMessage.slice(0, 220) + (apiMessage.length > 220 ? "…" : "") : ""
  return {
    message: short || "Google AI request failed. Please try again.",
    clientStatus: httpStatus >= 400 && httpStatus < 600 ? httpStatus : 503,
  }
}

function parseModelJsonText(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
  return JSON.parse(cleaned)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Parse retry hint from Google RPC error details (e.g. RetryInfo.retryDelay "6s").
 * @returns {number | null} milliseconds to wait, capped
 */
function parseGeminiRetryDelayMs(rawText) {
  try {
    const j = JSON.parse(rawText || "{}")
    const details = j?.error?.details
    if (!Array.isArray(details)) return null
    for (const d of details) {
      if (d?.["@type"]?.includes("RetryInfo") && d.retryDelay) {
        const s = String(d.retryDelay)
        const m = s.match(/^(\d+(?:\.\d+)?)s$/i)
        if (m) {
          const sec = Number(m[1])
          if (Number.isFinite(sec)) return Math.min(60000, Math.max(500, Math.round(sec * 1000)))
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function isGeminiQuotaError(rawText, httpStatus) {
  if (httpStatus === 429) {
    let status = ""
    let apiMessage = ""
    try {
      const j = JSON.parse(rawText || "{}")
      status = j?.error?.status || ""
      apiMessage = String(j?.error?.message || "")
      return /RESOURCE_EXHAUSTED|quota/i.test(status + apiMessage)
    } catch {
      return false
    }
  }
  let status = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    status = j?.error?.status || ""
    apiMessage = String(j?.error?.message || "")
  } catch {
    return false
  }
  return /RESOURCE_EXHAUSTED|quota/i.test(status + apiMessage)
}

function isGeminiRetryableError(rawText, httpStatus) {
  if (isGeminiQuotaError(rawText, httpStatus)) return false
  if ([429, 503, 500, 502].includes(httpStatus)) return true
  let status = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    status = j?.error?.status || ""
    apiMessage = String(j?.error?.message || "")
  } catch {
    return httpStatus >= 500
  }
  return /RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|high demand|overloaded|temporarily unavailable/i.test(
    status + apiMessage,
  )
}

function isGeminiOverloadError(rawText, httpStatus) {
  if (httpStatus === 503) return true
  let status = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    status = j?.error?.status || ""
    apiMessage = String(j?.error?.message || "")
  } catch {
    return false
  }
  return /UNAVAILABLE|high demand|overloaded|temporarily unavailable/i.test(status + apiMessage)
}

function isGeminiNonRetryableClientError(rawText, httpStatus) {
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 404) return true
  let status = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    status = j?.error?.status || ""
    apiMessage = String(j?.error?.message || "")
  } catch {
    return false
  }
  return /API key not valid|invalid argument|PERMISSION_DENIED|API_KEY_INVALID/i.test(apiMessage + status)
}

async function geminiGenerateJsonWithModel({ system, user, apiKey, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  let attempt = 0
  while (true) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.45,
            responseMimeType: "application/json",
          },
        }),
      })

      const raw = await res.text()
      if (!res.ok) {
        if (isGeminiNonRetryableClientError(raw, res.status)) {
          const { message, clientStatus } = formatGeminiHttpError(raw, res.status)
          throw throwHttpError(message, clientStatus)
        }
        const quota = isGeminiQuotaError(raw, res.status)
        const overload = isGeminiOverloadError(raw, res.status)
        const retryable = !overload && !quota && isGeminiRetryableError(raw, res.status)
        if (retryable && attempt < GEMINI_429_MAX_RETRIES) {
          const fromApi = parseGeminiRetryDelayMs(raw)
          const base = fromApi ?? 1200 * 2 ** attempt
          const jitter = Math.floor(Math.random() * 400)
          await sleep(base + jitter)
          attempt += 1
          continue
        }
        const { message, clientStatus } = formatGeminiHttpError(raw, res.status)
        const err = throwHttpError(message, clientStatus)
        err.geminiOverload = overload
        err.geminiQuota = quota
        err.geminiRaw = raw
        err.geminiHttpStatus = res.status
        throw err
      }

      let data
      try {
        data = JSON.parse(raw)
      } catch {
        throw throwHttpError("Invalid response from Google AI.", 502)
      }

      const candidate = data?.candidates?.[0]
      const text = candidate?.content?.parts?.map((p) => p.text).join("") || ""
      const finish = candidate?.finishReason

      if (!text.trim()) {
        const hint = finish ? ` (finish: ${finish})` : ""
        throw throwHttpError(`Google AI returned no text${hint}. Try again or adjust GEMINI_MODEL.`, 502)
      }

      try {
        return { provider: "gemini", model, parsed: parseModelJsonText(text) }
      } catch {
        throw throwHttpError("Google AI returned invalid JSON. Try again or simplify the request.", 502)
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        throw throwHttpError("AI request timed out. Try again with a shorter itinerary.", 504)
      }
      throw e
    } finally {
      clearTimeout(t)
    }
  }
}
async function geminiGenerateJson({ system, user }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null

  const primary = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).replace(/^models\//, "")
  const models = [primary, ...GEMINI_OVERLOAD_FALLBACK_MODELS.filter((m) => m !== primary)]

  let lastErr = null
  for (const model of models) {
    try {
      return await geminiGenerateJsonWithModel({ system, user, apiKey, model })
    } catch (e) {
      lastErr = e
      if (e?.geminiQuota || isGeminiQuotaError(e?.geminiRaw, e?.geminiHttpStatus)) {
        throw e
      }
      const tryNextModel =
        e?.geminiOverload ||
        e?.clientStatus === 504 ||
        isGeminiOverloadError(e?.geminiRaw, e?.geminiHttpStatus) ||
        e?.clientStatus === 429 ||
        e?.clientStatus === 503
      if (!tryNextModel || model === models[models.length - 1]) {
        throw e
      }
      console.warn(`[ai] Gemini model ${model} unavailable; trying next model…`)
    }
  }
  if (lastErr) throw lastErr
  return null
}

async function openaiGenerateJson({ system, user }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    })

    const raw = await res.text()
    if (!res.ok) {
      const { message, clientStatus } = formatOpenAiHttpError(raw, res.status)
      throw throwHttpError(message, clientStatus)
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      throw throwHttpError("Invalid response from OpenAI.", 502)
    }

    const text = data?.choices?.[0]?.message?.content
    if (!text) {
      throw throwHttpError("Empty OpenAI response. Try again.", 502)
    }

    try {
      return { provider: "openai", parsed: parseModelJsonText(text) }
    } catch {
      throw throwHttpError("OpenAI returned invalid JSON. Try again or simplify the itinerary.", 502)
    }
  } catch (e) {
    if (e?.name === "AbortError") {
      throw throwHttpError("AI request timed out. Try again with a shorter itinerary.", 504)
    }
    throw e
  } finally {
    clearTimeout(t)
  }
}

/** Gemini first (if GEMINI_API_KEY), else OpenAI, else demo. Falls through providers on transient errors. */
export async function llmChatJson({ system, user }) {
  const { cacheAiResponse } = await import("../utils/cacheHelpers.js")
  return cacheAiResponse("llm", { system, user }, async () => {
    if (process.env.GEMINI_API_KEY?.trim()) {
      try {
        const g = await geminiGenerateJson({ system, user })
        if (g) {
          logAi.info("AI call ok", { provider: "gemini" })
          recordDomainEvent("ai", true)
          return { demo: false, ...g }
        }
      } catch (err) {
        const transient = [429, 503, 504, 502, 500].includes(err?.clientStatus)
        logAi.warn("Gemini failed", { message: err?.message || String(err), transient })
        recordDomainEvent("ai", false, err?.message)
        console.warn("[ai] Gemini failed:", err?.message || err)
        if (!transient) throw err
        if (!process.env.OPENAI_API_KEY?.trim()) {
          console.warn("[ai] No OpenAI key; using demo fallback after Gemini error.")
          return { demo: true, parsed: null, fallbackReason: err?.message }
        }
      }
    }
    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
        const o = await openaiGenerateJson({ system, user })
        if (o) {
          logAi.info("AI call ok", { provider: "openai" })
          recordDomainEvent("ai", true)
          return { demo: false, ...o }
        }
      } catch (err) {
        logAi.warn("OpenAI failed", { message: err?.message || String(err) })
        recordDomainEvent("ai", false, err?.message)
        console.warn("[ai] OpenAI failed:", err?.message || err)
        return { demo: true, parsed: null, fallbackReason: err?.message }
      }
    }
    return { demo: true, parsed: null }
  })
}

export async function aiEnrichDescriptions(itinerarySnapshot) {
  const system = `You enrich travel itinerary copy. Output ONLY valid JSON with this exact shape:
{"description":"string (2-4 sentences, marketing tone, no prices)","days":[{"dayIndex":number,"activities":[{"activityIndex":number,"description":"string (1-3 sentences)"}]}]}
Rules:
- dayIndex is 0-based matching input days array order.
- activityIndex is 0-based per day.
- Each day may include dayLabel (route/theme for that day); weave that context into activity copy when present.
- Include every day and every activity from input; if an activity has no name, still write a generic description from destination + day context.
- No markdown, no code fences, JSON only.`

  const user = `Itinerary JSON:\n${clipJsonForPrompt(itinerarySnapshot)}`

  const { demo, parsed } = await llmChatJson({ system, user })
  if (!demo && parsed?.description && Array.isArray(parsed.days)) {
    return { demo: false, ...parsed }
  }

  const dest = itinerarySnapshot.destination || "this destination"
  const desc = `Discover ${dest} with a thoughtfully paced itinerary blending iconic sights and local flavor—perfect for travelers who want structure without feeling rushed.`
  const days = (itinerarySnapshot.days || []).map((day, dayIndex) => ({
    dayIndex,
    activities: (day.activities || []).map((a, activityIndex) => ({
      activityIndex,
      description:
        a.description?.trim() ||
        (a.name
          ? `${a.name} in ${dest}: a rewarding stop with time to take photos and soak in the atmosphere.`
          : `A memorable experience around ${dest} on day ${day.dayNumber ?? dayIndex + 1}.`),
    })),
  }))
  return { demo: true, description: desc, days }
}

export async function aiSuggestDayActivities({
  destination,
  dayNumber,
  hotel,
  tags,
  existingActivities,
  dayLabel = "",
}) {
  const label = String(dayLabel || "").trim()
  const system = `You suggest travel activities. Output ONLY valid JSON:
{"activities":[{"name":"string","description":"string","time":"HH:MM 24h","location":"string","category":"one of sightseeing|adventure|cultural|relaxation|dining|shopping","duration":"string"}]}
Rules:
- Suggest exactly 3 to 5 activities for ONE day in ${destination || "the destination"}.
- If a "Day route / theme" is given, activities MUST fit that arc (transfers, pacing, key stops implied by the theme). Spiritual pilgrimage days may use cultural + relaxation categories for darshan, trek segments, rest; use sightseeing for iconic stops; dining for meals; do not invent unsafe or impossible logistics.
- Times must progress logically through the day; start ~09:00 unless the theme clearly implies arrival/late start.
- Locations must be plausible for the destination (neighborhoods or landmark names, not fake business chains).
- JSON only.`

  const user = `Day ${dayNumber}.${label ? `\nDay route / theme: ${label}` : ""}
Hotel: ${hotel?.name || "TBD"} near ${hotel?.location || "city center"}.
Tags: ${(tags || []).join(", ") || "general"}.
Existing (may be empty): ${clipJsonForPrompt({ existingActivities })}`

  const { demo, parsed } = await llmChatJson({ system, user })
  if (!demo && Array.isArray(parsed?.activities) && parsed.activities.length > 0) {
    return { demo: false, activities: parsed.activities }
  }

  const d = destination || "your destination"
  return {
    demo: true,
    activities: [
      {
        name: "Morning orientation walk",
        description: `Stroll the main historic quarter of ${d}, get your bearings, and spot cafés for later.`,
        time: "09:30",
        location: `${d} — old town / waterfront`,
        category: "sightseeing",
        duration: "2 hours",
      },
      {
        name: "Local lunch & market",
        description: "Taste regional specialties at a busy market or food hall; good for photos and people-watching.",
        time: "12:30",
        location: `${d} — central market area`,
        category: "dining",
        duration: "1.5 hours",
      },
      {
        name: "Sunset viewpoint",
        description: "Wind down at a scenic overlook or promenade as the light turns golden.",
        time: "17:30",
        location: `${d} — popular viewpoint / waterfront`,
        category: "relaxation",
        duration: "1 hour",
      },
    ],
  }
}

function demoHighlightsFromItinerary(snapshot) {
  const dest = String(snapshot?.destination || "").trim() || "this destination"
  const bullets = []
  for (const day of snapshot?.days || []) {
    for (const a of day?.activities || []) {
      const name = String(a?.name || "").trim()
      if (!name) continue
      const loc = String(a?.location || "").trim()
      const cat = String(a?.category || "").trim()
      const line =
        loc && name.length < 72
          ? `${name} — ${loc}`
          : cat && !["sightseeing", ""].includes(cat)
            ? `${name} (${cat})`
            : name
      bullets.push(line.slice(0, 92))
      if (bullets.length >= 8) break
    }
    if (bullets.length >= 8) break
  }
  const uniq = [...new Set(bullets)]
  if (uniq.length >= 3) return uniq.slice(0, 6)
  if (uniq.length > 0) {
    const extras = [
      `Local flavor around ${dest}`,
      "Dining, culture & stroll-worthy streets",
      "Balanced pacing with time to explore",
    ]
    let i = 0
    while (uniq.length < 3) {
      uniq.push(extras[i % extras.length])
      i += 1
    }
    return uniq.slice(0, 6)
  }
  return [
    `Signature sights & neighborhoods in ${dest}`,
    "Hands-on dining, culture, and stroll-worthy streets",
    "Thoughtful pacing with room to explore",
  ]
}

export async function aiSuggestHighlights(itinerarySnapshot) {
  const system = `You write short trip highlight lines for a travel listing. Output ONLY valid JSON:
{"highlights":["string", ...]}
Rules:
- 4 to 8 strings; each 10–90 characters; brochure tone; no markdown, no numbering, no quotes inside strings.
- Summarize themes across ALL days using only what appears in the input (activities, hotels, destination). Combine overlapping ideas; do not invent specific venues not implied by the input.
- JSON only.`

  const user = `Itinerary JSON:\n${clipJsonForPrompt(itinerarySnapshot)}`

  const { demo, parsed } = await llmChatJson({ system, user })
  if (!demo && Array.isArray(parsed?.highlights)) {
    const highlights = parsed.highlights
      .map((h) => String(h || "").trim())
      .filter(Boolean)
      .map((h) => h.slice(0, 120))
      .slice(0, 8)
    if (highlights.length > 0) {
      return { demo: false, highlights }
    }
  }

  return { demo: true, highlights: demoHighlightsFromItinerary(itinerarySnapshot) }
}

export async function aiTripSummary(itinerarySnapshot) {
  const system = `Write a short shareable trip summary. Output ONLY valid JSON: {"summary":"plain text, max 550 characters, no markdown, no hashtags unless user asked"}`

  const user = `Summarize this itinerary for friends:\n${clipJsonForPrompt(itinerarySnapshot)}`

  const { demo, parsed } = await llmChatJson({ system, user })
  if (!demo && parsed?.summary && typeof parsed.summary === "string") {
    return { demo: false, summary: parsed.summary.trim().slice(0, 600) }
  }

  const t = itinerarySnapshot.title || "Trip"
  const dest = itinerarySnapshot.destination || ""
  const dayCount =
    itinerarySnapshot.totalDays ??
    (itinerarySnapshot.numberOfNights != null ? Number(itinerarySnapshot.numberOfNights) + 1 : null)
  const daysLabel = dayCount != null && Number.isFinite(dayCount) ? `${dayCount} days` : "several days"
  return {
    demo: true,
    summary: `${t}${dest ? ` in ${dest}` : ""} — ${daysLabel} of curated stops, local flavor, and easy pacing. Built with TravelPlan; great inspiration for your next escape.`,
  }
}

function demoPersonalizedItinerary({ budget, travelStyle, interests, destination, numberOfNights, fallbackReason }) {
  const nights = Math.min(14, Math.max(1, Number(numberOfNights) || 3))
  const totalDays = nights + 1
  const dest = String(destination || "").trim() || "Goa, India"
  const style = String(travelStyle || "cultural").toLowerCase()
  const interestList = (Array.isArray(interests) ? interests : [])
    .map((x) => String(x).trim())
    .filter(Boolean)
  const focus = interestList[0] || style

  const budgetMin = Math.max(0, Number(budget?.min) || 400)
  const budgetMax = Math.max(budgetMin, Number(budget?.max) || budgetMin + 600)

  const days = []
  for (let d = 1; d <= totalDays; d += 1) {
    days.push({
      dayNumber: d,
      dayLabel: d === 1 ? "Arrival & orientation" : d === totalDays ? "Farewell highlights" : `Day ${d} — ${focus}`,
      hotel: {
        name: `${dest.split(",")[0].trim()} Central Hotel`,
        location: dest,
        rating: style === "luxury" ? 5 : 4,
      },
      activities: [
        {
          name: d === 1 ? "Neighborhood walk" : `${focus} experience`,
          description: `Demo activity tailored to ${style} travel and your interest in ${focus}.`,
          time: "10:00",
          location: dest,
          category: style === "adventure" ? "adventure" : "cultural",
          duration: "2-3 hours",
          cost: Math.round((budgetMax / totalDays / 3) * 0.4),
        },
        {
          name: "Local lunch",
          description: "Regional flavors at a popular local spot.",
          time: "13:00",
          location: dest,
          category: "dining",
          duration: "1.5 hours",
          cost: Math.round((budgetMax / totalDays / 3) * 0.2),
        },
        {
          name: "Sunset viewpoint",
          description: "Wind down at a scenic spot.",
          time: "17:30",
          location: dest,
          category: "relaxation",
          duration: "1 hour",
          cost: 0,
        },
      ],
    })
  }

  const busyFallback = Boolean(fallbackReason)
  const description = busyFallback
    ? `Starter itinerary for ${nights} nights in ${dest} (${style} focus on ${interestList.join(", ") || "exploring"}). The AI service was busy—we built this plan locally. Try "Generate itinerary" again in a minute for a fully tailored plan.`
    : `Demo itinerary for ${nights} nights in ${dest}, styled for ${style} travelers who enjoy ${interestList.join(", ") || "exploring"}. Add GEMINI_API_KEY or OPENAI_API_KEY for fully tailored AI plans.`

  return {
    title: `${dest.split(",")[0]} ${style.charAt(0).toUpperCase() + style.slice(1)} Escape`,
    destination: dest,
    numberOfNights: nights,
    description,
    budget: { min: budgetMin, max: budgetMax, currency: budget?.currency || "USD" },
    bestTimeToVisit: "November – February",
    highlights: [
      `${focus} highlights in ${dest}`,
      `${style} pacing across ${totalDays} days`,
      "Mix of food, culture, and downtime",
    ],
    tags: [style].filter(Boolean),
    days,
  }
}

export async function aiGeneratePersonalizedItinerary({
  budget,
  travelStyle,
  interests,
  destination,
  numberOfNights,
}) {
  const nights = Math.min(14, Math.max(1, Number(numberOfNights) || 3))
  const totalDays = nights + 1
  const style = String(travelStyle || "cultural").trim()
  const interestList = (Array.isArray(interests) ? interests : String(interests || "").split(","))
    .map((x) => String(x).trim())
    .filter(Boolean)
  const destHint = String(destination || "").trim()
  const budgetMin = Number(budget?.min)
  const budgetMax = Number(budget?.max)

  const system = `You are an expert travel planner. Output ONLY valid JSON with this exact shape:
{
  "title": "string",
  "destination": "string (City, Region, Country)",
  "numberOfNights": number,
  "description": "string (2-4 sentences)",
  "budget": { "min": number, "max": number, "currency": "USD" },
  "bestTimeToVisit": "string",
  "highlights": ["string", ...],
  "tags": ["beach|adventure|cultural|luxury|budget|family|romantic|solo|spiritual|mountain|nature|food|history|snowfall"],
  "days": [{
    "dayNumber": number,
    "dayLabel": "optional short theme",
    "hotel": { "name": "string", "location": "string", "rating": 3-5 },
    "activities": [{
      "name": "string",
      "description": "string",
      "time": "HH:MM 24h",
      "location": "string",
      "category": "sightseeing|adventure|cultural|relaxation|dining|shopping",
      "duration": "string",
      "cost": number
    }]
  }]
}
Rules:
- Create exactly ${totalDays} days (numberOfNights=${nights} means ${totalDays} calendar days).
- Include travelStyle "${style}" in tags; align activities with user interests.
- Each day: 1 hotel + 3-5 activities with logical times.
- Activity costs in USD should roughly fit total budget ${Number.isFinite(budgetMin) ? budgetMin : "?"}–${Number.isFinite(budgetMax) ? budgetMax : "?"} across the trip.
- Use real landmark/neighborhood names for the destination; no fake chains.
- JSON only, no markdown.`

  const user = `Travel preferences:
- Budget (USD): min ${Number.isFinite(budgetMin) ? budgetMin : "flexible"}, max ${Number.isFinite(budgetMax) ? budgetMax : "flexible"}
- Travel style: ${style}
- Interests: ${interestList.join(", ") || "general sightseeing"}
${destHint ? `- Preferred destination: ${destHint}` : "- Pick a realistic destination that matches style and interests."}
- Trip length: ${nights} nights (${totalDays} days)`

  const { demo, parsed, fallbackReason } = await llmChatJson({ system, user })
  if (!demo && parsed?.destination && Array.isArray(parsed?.days) && parsed.days.length > 0) {
    return { demo: false, itinerary: parsed }
  }

  return {
    demo: true,
    busyFallback: Boolean(fallbackReason),
    itinerary: demoPersonalizedItinerary({
      budget,
      travelStyle: style,
      interests: interestList,
      destination: destHint,
      numberOfNights: nights,
      fallbackReason,
    }),
  }
}

const CHAT_SYSTEM = `You are TravelPlan AI, a friendly travel planning assistant inside a trip itinerary app.
Output ONLY valid JSON with this exact shape:
{
  "reply": "string (warm conversational tone; use \\n for line breaks; **bold** for emphasis; - for bullet lists)",
  "planDraft": null | {
    "destination": "string (City, Region, Country)",
    "numberOfNights": number,
    "budget": { "min": number, "max": number, "currency": "string" },
    "travelStyle": "beach|adventure|cultural|luxury|budget|family|romantic|solo|spiritual|mountain|nature|food|history|snowfall",
    "interests": ["string", ...]
  }
}
Rules:
- Answer travel questions helpfully: destinations, budgets, seasons, packing, local tips.
- When the user asks to plan a trip or gives destination + budget, include planDraft with parsed realistic values.
- Indian amounts like "20k" or "under 20000" mean INR unless another currency is stated.
- planDraft only when the user clearly wants a trip planned; otherwise null.
- Keep replies concise (under ~400 words) unless a detailed day plan is requested.
- JSON only, no markdown fences.`

function formatConversationForPrompt(messages) {
  return messages
    .slice(-24)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n")
}

export function normalizePlanDraft(draft) {
  if (!draft || typeof draft !== "object") return null
  const destination = String(draft.destination || "").trim()
  if (!destination) return null

  const nights = Math.min(14, Math.max(1, Number(draft.numberOfNights) || 3))
  const style = String(draft.travelStyle || "cultural").toLowerCase()
  const travelStyle = ITINERARY_TAG_OPTIONS.includes(style) ? style : "cultural"
  const interests = (Array.isArray(draft.interests) ? draft.interests : [])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 8)

  const b = draft.budget || {}
  const min = Math.max(0, Number(b.min) || 0)
  const max = Math.max(min, Number(b.max) || min || 1000)

  return {
    destination,
    numberOfNights: nights,
    budget: {
      min,
      max,
      currency: String(b.currency || "USD").trim() || "USD",
    },
    travelStyle,
    interests: interests.length > 0 ? interests : [travelStyle],
  }
}

function demoChatReply(messages) {
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content || ""
  const lower = lastUser.toLowerCase()

  if (/goa/i.test(lastUser) && /20\s*k|20k|20000|20,000|under\s*20/i.test(lastUser)) {
    return {
      reply:
        "Here's a **3-night Goa getaway under ₹20,000** (approx. per person):\n\n" +
        "**Day 1** — Arrive in North Goa, budget stay near Calangute (~₹2,500/night)\n" +
        "**Day 2** — Baga beach, Anjuna flea market, sunset at Chapora Fort\n" +
        "**Day 3** — Old Goa churches + Panjim Latin Quarter food walk\n" +
        "**Day 4** — Morning beach, depart\n\n" +
        "**Budget split:**\n" +
        "- Stay: ~₹7,500\n" +
        "- Food & drinks: ~₹5,000\n" +
        "- Scooter & local travel: ~₹2,500\n" +
        "- Activities & misc: ~₹5,000\n\n" +
        "**Best time:** November–February\n\n" +
        "Tap **Generate full itinerary** below and I'll build a saveable day-by-day plan!",
      planDraft: {
        destination: "Goa, India",
        numberOfNights: 3,
        budget: { min: 15000, max: 20000, currency: "INR" },
        travelStyle: "budget",
        interests: ["beaches", "food", "nightlife"],
      },
    }
  }

  if (/best time|when to visit|season/i.test(lower) && /kerala|munnar|alleppey/i.test(lower)) {
    return {
      reply:
        "**Best time for Kerala:** September–March is ideal.\n\n" +
        "- **Oct–Feb** — Pleasant weather; great for backwaters, Munnar tea hills, and beaches\n" +
        "- **Jun–Sep (monsoon)** — Lush greenery & Ayurveda retreats; some outdoor plans may be rain-affected\n\n" +
        "Want me to plan a Kerala trip? Share nights and budget (e.g. *3 nights under ₹25k*).",
      planDraft: null,
    }
  }

  if (/plan|trip|itinerary|visit|weekend|getaway/i.test(lower)) {
    return {
      reply:
        "I'd love to help you plan! Share:\n\n" +
        "- **Where** (e.g. Goa, Kerala, Manali)\n" +
        "- **How many nights**\n" +
        "- **Budget** (e.g. ₹20,000 or $800)\n" +
        "- **Interests** (beaches, temples, food, adventure…)\n\n" +
        'Try: **"Plan Goa trip under 20k"**',
      planDraft: null,
    }
  }

  return {
    reply:
      "Hi! I'm your **TravelPlan assistant**. I can help you:\n\n" +
      "- Plan trips on a budget\n" +
      "- Suggest destinations and best seasons\n" +
      "- Build day-by-day itineraries you can save\n\n" +
      'Try asking: **"Plan Goa trip under 20k"** or **"Best time to visit Kerala?"**',
    planDraft: null,
  }
}

/**
 * Conversational travel chat with optional structured trip draft.
 * @param {{ role: "user"|"assistant", content: string }[]} messages
 */
export async function aiChat(messages) {
  const validMessages = (messages || [])
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        String(m.content || "").trim(),
    )
    .map((m) => ({
      role: m.role,
      content: String(m.content).trim().slice(0, 4000),
    }))

  if (validMessages.length === 0) {
    throw throwHttpError("At least one message is required", 400)
  }

  const user = `Conversation so far:\n${formatConversationForPrompt(validMessages)}\n\nRespond to the latest user message.`

  const { demo, parsed } = await llmChatJson({ system: CHAT_SYSTEM, user })

  if (!demo && parsed?.reply && typeof parsed.reply === "string") {
    return {
      demo: false,
      reply: parsed.reply.trim().slice(0, 6000),
      planDraft: normalizePlanDraft(parsed.planDraft),
    }
  }

  const demoResult = demoChatReply(validMessages)
  return {
    demo: true,
    reply: demoResult.reply,
    planDraft: normalizePlanDraft(demoResult.planDraft),
  }
}

export async function aiBookingQuery(question, bookings = []) {
  const q = String(question || "").trim()
  const list = Array.isArray(bookings) ? bookings : []

  const system = `You are a travel booking assistant. Answer using ONLY the provided bookings JSON. Be concise. If unknown, say you don't have that booking on file. Output JSON: {"answer":"..."}`

  const user = `Question: ${q || "Summarize my bookings"}\n\nBookings:\n${clipJsonForPrompt(list)}`

  const { demo, parsed } = await llmChatJson({ system, user })
  if (!demo && parsed?.answer) {
    return { demo: false, answer: String(parsed.answer).trim(), bookings: list }
  }

  const lower = q.toLowerCase()
  if (lower.includes("hotel")) {
    const hotels = list.filter((b) => b.type === "hotel")
    if (!hotels.length) return { demo: true, answer: "I don't see any hotel bookings saved yet.", bookings: list }
    const h = hotels[0]
    return {
      demo: true,
      answer: `You booked ${h.provider}${h.reference ? ` (ref ${h.reference})` : ""}${h.date ? ` — check-in ${new Date(h.date).toLocaleDateString()}` : ""}.`,
      bookings: list,
    }
  }
  if (lower.includes("flight") || lower.includes("when")) {
    const flights = list.filter((b) => b.type === "flight")
    if (!flights.length) return { demo: true, answer: "No flight bookings found.", bookings: list }
    const f = flights[0]
    return {
      demo: true,
      answer: `Flight ${f.provider || ""} ${f.reference || ""}${f.date ? ` on ${new Date(f.date).toLocaleDateString()}` : ""}${f.gate ? `, Gate ${f.gate}` : ""}.`,
      bookings: list,
    }
  }
  if (lower.includes("tomorrow")) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const key = tomorrow.toISOString().slice(0, 10)
    const matches = list.filter((b) => b.date && new Date(b.date).toISOString().slice(0, 10) === key)
    if (!matches.length) return { demo: true, answer: "No bookings scheduled for tomorrow.", bookings: list }
    return {
      demo: true,
      answer: matches.map((b) => `${b.type}: ${b.provider} (${b.reference || "no ref"})`).join("; "),
      bookings: list,
    }
  }
  if (lower.includes("reference")) {
    const refs = list.map((b) => b.reference).filter(Boolean)
    return {
      demo: true,
      answer: refs.length ? `References: ${refs.join(", ")}` : "No booking references on file.",
      bookings: list,
    }
  }

  if (!list.length) return { demo: true, answer: "You have no saved bookings yet. Add them from the Bookings hub.", bookings: list }
  return {
    demo: true,
    answer: `You have ${list.length} saved booking(s): ${list.map((b) => `${b.type} — ${b.provider}`).join("; ")}.`,
    bookings: list,
  }
}

export async function aiDocumentQuery(question, documents = [], missing = null) {
  const q = String(question || "").trim()
  const list = Array.isArray(documents) ? documents : []

  const system = `You are a travel document vault assistant. Answer using ONLY the provided documents JSON and missing checklist. Be concise. If unknown, say the document is not on file. Output JSON: {"answer":"..."}`

  const user = `Question: ${q || "Summarize my travel documents"}\n\nDocuments:\n${clipJsonForPrompt(list)}\n\nMissing checklist:\n${clipJsonForPrompt(missing || {})}`

  const { demo, parsed } = await llmChatJson({ system, user })
  if (!demo && parsed?.answer) {
    return { demo: false, answer: String(parsed.answer).trim(), documents: list, missing }
  }

  const lower = q.toLowerCase()
  if (lower.includes("passport") && lower.includes("expir")) {
    const p = list.find((d) => d.type === "passport")
    if (!p?.expiryDate) return { demo: true, answer: "I don't have a passport with an expiry date on file.", documents: list, missing }
    return {
      demo: true,
      answer: `Your passport${p.title ? ` (${p.title})` : ""} expires on ${new Date(p.expiryDate).toLocaleDateString()}.`,
      documents: list,
      missing,
    }
  }
  if (lower.includes("hotel") && lower.includes("voucher")) {
    const h = list.find((d) => d.type === "hotel_voucher")
    if (!h) return { demo: true, answer: "No hotel voucher found in your vault.", documents: list, missing }
    return { demo: true, answer: `Hotel voucher: ${h.title}${h.ocrFields?.hotelName ? ` — ${h.ocrFields.hotelName}` : ""}.`, documents: list, missing }
  }
  if (lower.includes("insurance")) {
    const ins = list.find((d) => d.type === "travel_insurance")
    if (!ins) return { demo: true, answer: "No travel insurance document on file.", documents: list, missing }
    return {
      demo: true,
      answer: `Yes — ${ins.title}${ins.expiryDate ? ` (expires ${new Date(ins.expiryDate).toLocaleDateString()})` : ""}.`,
      documents: list,
      missing,
    }
  }
  if (lower.includes("missing") || lower.includes("required")) {
    const miss = missing?.missing || []
    if (!miss.length) return { demo: true, answer: "All essential documents appear to be on file for this trip.", documents: list, missing }
    return {
      demo: true,
      answer: `Missing documents: ${miss.map((m) => m.label).join(", ")}.`,
      documents: list,
      missing,
    }
  }
  if (!list.length) {
    return { demo: true, answer: "Your document vault is empty. Upload passports, visas, tickets, and insurance from the Documents hub.", documents: list, missing }
  }
  return {
    demo: true,
    answer: `You have ${list.length} document(s): ${list.map((d) => `${d.type.replace(/_/g, " ")} — ${d.title}`).join("; ")}.`,
    documents: list,
    missing,
  }
}

export async function aiRiskQuery(question, riskContext = {}) {
  const q = String(question || "").trim()
  const system = `You are a travel safety and trip health copilot. Answer using ONLY the risk analysis JSON provided.
Be concise and actionable. Output JSON: {"answer":"...","followUps":["optional short questions"]}`

  const user = `Question: ${q || "Is my trip safe?"}\n\nRisk analysis:\n${clipJsonForPrompt(riskContext)}`
  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed?.answer) {
    return {
      demo: false,
      answer: String(parsed.answer).trim(),
      followUps: parsed.followUps || [],
      context: riskContext,
    }
  }

  const score = riskContext.healthScore ?? 100
  const open = riskContext.openRisks || []
  const lower = q.toLowerCase()

  if (lower.includes("safe")) {
    return {
      demo: true,
      answer: open.length
        ? `Trip health is ${score}/100 (${riskContext.healthLabel || "review needed"}). ${open.length} open risk(s) — check the dashboard.`
        : `Trip health is ${score}/100 — no critical open risks.`,
      context: riskContext,
    }
  }
  if (lower.includes("change") || lower.includes("reduce")) {
    const top = open[0]
    return {
      demo: true,
      answer: top
        ? `Top priority: ${top.title}. ${top.description || "Review recommendations on the risk card."}`
        : "No major changes needed — your schedule looks balanced.",
      context: riskContext,
    }
  }
  if (lower.includes("why") && lower.includes("recommend")) {
    return {
      demo: true,
      answer: open.length
        ? `Recommendations are based on weather, bookings, budget, documents, and schedule analysis for your destination.`
        : "Run Analyze on the Trip Health dashboard to generate AI recommendations.",
      context: riskContext,
    }
  }

  return {
    demo: true,
    answer: `Trip health ${score}/100. ${open.length ? `${open.length} open risk(s).` : "Looking good."} Ask about safety, changes, or travel time.`,
    context: riskContext,
  }
}

export async function aiFlightQuery(question, flights = []) {
  const q = String(question || "").trim()
  const system = `You are a live flight tracking assistant like Flighty. Answer using ONLY the flight JSON provided.
Be concise and actionable. Output JSON: {"answer":"...","followUps":[]}`

  const user = `Question: ${q || "Is my flight on time?"}\n\nFlights:\n${clipJsonForPrompt(flights)}`
  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed?.answer) {
    return { demo: false, answer: String(parsed.answer).trim(), followUps: parsed.followUps || [], flights }
  }

  const list = Array.isArray(flights) ? flights : []
  const lower = q.toLowerCase()
  const primary = list[0]

  if (!primary) {
    return { demo: true, answer: "No tracked flights for this trip. Add a flight booking or start tracking.", flights: list }
  }

  if (lower.includes("on time") || lower.includes("delayed")) {
    const onTime = (primary.delayMinutes || 0) < 15 && primary.status !== "Delayed"
    return {
      demo: true,
      answer: onTime
        ? `${primary.flightNumber} is on schedule (${primary.status}).`
        : `${primary.flightNumber} is delayed by ${primary.delayMinutes || 0} minutes.`,
      flights: list,
    }
  }
  if (lower.includes("leave") || lower.includes("airport")) {
    return {
      demo: true,
      answer: `Leave for the airport about 3 hours before departure${primary.gate ? ` (Gate ${primary.gate})` : ""}. Add 30 min if delayed.`,
      flights: list,
    }
  }
  if (lower.includes("gate")) {
    return {
      demo: true,
      answer: primary.gate
        ? `Current gate for ${primary.flightNumber} is ${primary.gate}, Terminal ${primary.terminal || "TBD"}.`
        : `Gate not assigned yet for ${primary.flightNumber}.`,
      flights: list,
    }
  }
  if (lower.includes("hotel") || lower.includes("check-in")) {
    const affected = (primary.delayMinutes || 0) >= 45
    return {
      demo: true,
      answer: affected
        ? `Yes — ${primary.delayMinutes} min delay may affect hotel check-in. Contact the hotel for late arrival.`
        : "Current delay should not significantly affect hotel check-in.",
      flights: list,
    }
  }
  if (lower.includes("cancel") || lower.includes("alternative")) {
    if (primary.status === "Cancelled") {
      return {
        demo: true,
        answer: `${primary.flightNumber} is cancelled. Search alternative flights on the same route or contact your airline for rebooking.`,
        flights: list,
      }
    }
    return { demo: true, answer: `${primary.flightNumber} is ${primary.status}, not cancelled.`, flights: list }
  }

  return {
    demo: true,
    answer: `${primary.flightNumber}: ${primary.status}, Gate ${primary.gate || "TBD"}, delay ${primary.delayMinutes || 0} min.`,
    flights: list,
  }
}

export async function aiBudgetQuery(question, budgetContext = {}) {
  const q = String(question || "").trim()
  const system = `You are a travel budget optimization copilot like Google Travel and Hopper.
Answer using ONLY the budget optimization JSON provided.
Be concise and actionable. Output JSON: {"answer":"...","followUps":["optional short questions"]}`

  const user = `Question: ${q || "How can I save money on this trip?"}\n\nBudget analysis:\n${clipJsonForPrompt(budgetContext)}`
  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed?.answer) {
    return {
      demo: false,
      answer: String(parsed.answer).trim(),
      followUps: parsed.followUps || [],
      context: budgetContext,
    }
  }

  const savings = budgetContext.potentialSavings ?? 0
  const health = budgetContext.healthScore ?? 70
  const recs = budgetContext.openRecommendations || budgetContext.recommendations || []
  const lower = q.toLowerCase()

  if (lower.includes("save") || lower.includes("reduce") || lower.includes("cheaper")) {
    const top = recs[0]
    return {
      demo: true,
      answer: top
        ? `Top tip: ${top.title} — saves ${top.estimatedSavings || 0}. ${top.reason || ""}`
        : savings > 0
          ? `You could save up to ${savings} by accepting optimization suggestions.`
          : "Run Analyze on the Budget Optimizer to generate savings recommendations.",
      context: budgetContext,
    }
  }
  if (lower.includes("health") || lower.includes("score")) {
    return {
      demo: true,
      answer: `Budget health is ${health}/100 (${budgetContext.healthLabel || "review"}). ${budgetContext.expenseIntegration?.overBudget ? "Spending exceeds plan." : "On track."}`,
      context: budgetContext,
    }
  }
  if (lower.includes("hotel")) {
    const hotel = recs.find((r) => r.category === "hotel")
    return {
      demo: true,
      answer: hotel ? hotel.reason || hotel.title : "Compare nearby budget hotels on the comparison table.",
      context: budgetContext,
    }
  }

  return {
    demo: true,
    answer: `Potential savings: ${savings}. Budget health ${health}/100. ${recs.length} recommendation(s) available.`,
    context: budgetContext,
  }
}
