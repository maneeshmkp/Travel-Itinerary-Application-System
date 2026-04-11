/**
 * LLM-backed JSON responses: prefers Google Gemini (GEMINI_API_KEY), then OpenAI (OPENAI_API_KEY), else demo mode.
 */

const MAX_PAYLOAD_CHARS = 28000
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
/** Cost-efficient stable model; avoids deprecated 2.0 Flash and heavier default quotas. */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"
const GEMINI_429_MAX_RETRIES = 3

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

function isGeminiRetryable429(rawText, httpStatus) {
  if (httpStatus !== 429) return false
  let status = ""
  let apiMessage = ""
  try {
    const j = JSON.parse(rawText || "{}")
    status = j?.error?.status || ""
    apiMessage = String(j?.error?.message || "")
  } catch {
    return true
  }
  return /RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED/i.test(status + apiMessage) || httpStatus === 429
}

async function geminiGenerateJson({ system, user }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).replace(/^models\//, "")
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  let attempt = 0
  while (true) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 55000)

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
        const retryable = isGeminiRetryable429(raw, res.status)
        if (retryable && attempt < GEMINI_429_MAX_RETRIES) {
          const fromApi = parseGeminiRetryDelayMs(raw)
          const base = fromApi ?? 1200 * 2 ** attempt
          const jitter = Math.floor(Math.random() * 400)
          await sleep(base + jitter)
          attempt += 1
          continue
        }
        const { message, clientStatus } = formatGeminiHttpError(raw, res.status)
        throw throwHttpError(message, clientStatus)
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
        return { provider: "gemini", parsed: parseModelJsonText(text) }
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

async function openaiGenerateJson({ system, user }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 55000)

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

/** Gemini first (if GEMINI_API_KEY), else OpenAI, else demo. */
async function llmChatJson({ system, user }) {
  if (process.env.GEMINI_API_KEY?.trim()) {
    const g = await geminiGenerateJson({ system, user })
    if (g) return { demo: false, ...g }
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    const o = await openaiGenerateJson({ system, user })
    if (o) return { demo: false, ...o }
  }
  return { demo: true, parsed: null }
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
