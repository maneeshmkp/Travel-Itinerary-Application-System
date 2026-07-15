import { llmChatJson } from "../aiService.js"
import ChatSession from "../../models/ChatSession.js"
import {
  buildCopilotContextBlock,
  loadExpenseSummary,
  loadItinerarySnapshot,
} from "./copilotContext.js"
import { executeToolCalls, getToolDefinitions } from "./copilotTools.js"
import { normalizePlanDraft } from "../aiService.js"

const COPILOT_SYSTEM = `You are TravelPlan Copilot — an intelligent travel assistant inside a MERN itinerary app.
You have access to tools for weather, flights, hotels, nearby places, itinerary edits, budget, expenses, and map actions.

Output ONLY valid JSON with this shape:
{
  "reply": "string (warm tone; use \\n; **bold**; bullet lists with -)",
  "planDraft": null | { "destination", "numberOfNights", "budget": {min,max,currency}, "travelStyle", "interests":[] },
  "toolCalls": [{ "tool": "tool_name", "args": {} }],
  "followUps": ["3-5 short follow-up questions"],
  "quickActions": [{ "id": "generate_itinerary|open_map|show_flights|show_hotels|book_flight|book_hotel|optimize_route|download_pdf|share_trip", "label": "string", "payload": {} }],
  "cards": []
}

Available tools: ${JSON.stringify(getToolDefinitions().map((t) => t.name))}

Rules:
- Use conversation history — follow-ups like "reduce budget" or "add a beach" refer to the active trip/plan.
- When user wants to edit a saved trip, use modify_itinerary with action: remove_activity|add_activity|move_activity|swap_days|replace_hotel|update_budget|remove_category.
- For weather questions use get_weather. For flights/hotels use search_flights/search_hotels with sortBy when asked.
- For nearby restaurants/ATMs/hospitals use search_nearby_places with type.
- For spending use add_expense or get_expense_summary. For budget questions use get_budget_summary.
- For map requests use map_action with action show_day|highlight_hotel|show_activities.
- Include planDraft when user wants a new trip planned (not when editing existing).
- followUps: 3-5 contextual suggestions. quickActions: relevant buttons for the reply.
- Indian amounts like 20k mean INR unless stated otherwise.
- JSON only, no markdown fences.`

function formatMessages(messages) {
  return (messages || [])
    .slice(-24)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n")
}

function normalizeCopilotResponse(parsed) {
  if (!parsed || typeof parsed !== "object") return null
  return {
    reply: String(parsed.reply || "").trim().slice(0, 8000),
    planDraft: parsed.planDraft ? normalizePlanDraft(parsed.planDraft) : null,
    toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls.slice(0, 5) : [],
    followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 5).map(String) : [],
    quickActions: Array.isArray(parsed.quickActions) ? parsed.quickActions.slice(0, 8) : [],
    cards: Array.isArray(parsed.cards) ? parsed.cards : [],
  }
}

function demoCopilotReply(messages, ctx) {
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === "user")?.content || ""
  const lower = lastUser.toLowerCase()
  const toolCalls = []
  const followUps = ["Reduce budget?", "Find nearby restaurants?", "Show weather forecast?", "Optimize route?"]
  const quickActions = [{ id: "generate_itinerary", label: "Generate itinerary", payload: {} }]

  if (/rain|weather|tomorrow/i.test(lower)) {
    toolCalls.push({ tool: "get_weather", args: { tomorrow: true, destination: ctx.itinerary?.destination } })
  }
  if (/hotel|stay/i.test(lower) && /cheap|below|under|₹|rs/i.test(lower)) {
    toolCalls.push({ tool: "search_hotels", args: { maxPrice: 3000, sortBy: "price", destination: ctx.itinerary?.destination } })
    quickActions.push({ id: "show_hotels", label: "Show hotels", payload: {} })
  }
  if (/flight/i.test(lower)) {
    toolCalls.push({ tool: "search_flights", args: { morning: /morning/i.test(lower), sortBy: "price" } })
    quickActions.push({ id: "show_flights", label: "Show flights", payload: {} })
  }
  if (/restaurant|atm|hospital|cafe|nearby/i.test(lower)) {
    const type = /atm/i.test(lower) ? "atm" : /hospital/i.test(lower) ? "hospital" : "restaurant"
    toolCalls.push({ tool: "search_nearby_places", args: { type } })
    quickActions.push({ id: "open_map", label: "Open map", payload: {} })
  }
  if (/spent|expense|₹\s*\d+/i.test(lower)) {
    const m = lastUser.match(/₹?\s*(\d[\d,]*)/)
    if (m) toolCalls.push({ tool: "add_expense", args: { amount: Number(m[1].replace(/,/g, "")), description: lastUser.slice(0, 80) } })
    else toolCalls.push({ tool: "get_expense_summary", args: {} })
  }
  if (/remove|delete|move|swap|replace|add.*beach|reduce budget/i.test(lower) && ctx.itinerary) {
    if (/museum/i.test(lower)) toolCalls.push({ tool: "modify_itinerary", args: { action: "remove_activity", activityName: "museum" } })
    else if (/shopping/i.test(lower)) toolCalls.push({ tool: "modify_itinerary", args: { action: "remove_category", category: "shopping" } })
    else if (/budget/i.test(lower)) {
      const m = lastUser.match(/₹?\s*(\d[\d,]*)/)
      toolCalls.push({ tool: "modify_itinerary", args: { action: "update_budget", max: m ? Number(m[1].replace(/,/g, "")) : 40000 } })
      toolCalls.push({ tool: "get_budget_summary", args: {} })
    } else if (/beach/i.test(lower)) {
      toolCalls.push({ tool: "modify_itinerary", args: { action: "add_activity", dayNumber: 2, activity: { name: "Beach visit", category: "relaxation", description: "Relax at the beach", time: "4:00 PM", location: ctx.itinerary.destination } } })
    }
  }
  if (/map|show.*day|zoom/i.test(lower) && ctx.itinerary) {
    const dayM = lastUser.match(/day\s*(\d+)/i)
    toolCalls.push({ tool: "map_action", args: { action: "show_day", dayNumber: dayM ? Number(dayM[1]) : 1 } })
    quickActions.push({ id: "open_map", label: "Open map", payload: { dayNumber: dayM ? Number(dayM[1]) : 1 } })
  }

  let reply =
    "I'm your **Travel Copilot** (demo mode). I can help plan trips, edit itineraries, check weather, find flights & hotels, and track expenses.\n\n"
  if (ctx.itinerary) {
    reply += `I see your **${ctx.itinerary.title}** trip to ${ctx.itinerary.destination}. Ask me to modify days, check budget, or find nearby places.\n\n`
  } else {
    reply += 'Try: **"Plan Kerala trip"** then **"Reduce budget to ₹40,000"**'
  }

  return { reply, planDraft: null, toolCalls, followUps, quickActions, cards: [] }
}

async function saveSessionMessages(sessionId, userId, userContent, assistantPayload, itineraryId) {
  if (!userId) return null

  let session
  if (sessionId) {
    session = await ChatSession.findOne({ _id: sessionId, userId })
  }
  if (!session) {
    session = await ChatSession.create({
      userId,
      title: "New chat",
      itineraryId: itineraryId || null,
    })
  }

  session.messages.push({ role: "user", content: userContent })
  session.messages.push({
    role: "assistant",
    content: assistantPayload.reply,
    cards: assistantPayload.cards,
    quickActions: assistantPayload.quickActions,
    followUps: assistantPayload.followUps,
    planDraft: assistantPayload.planDraft,
  })
  if (assistantPayload.planDraft) session.planDraft = assistantPayload.planDraft
  if (itineraryId && !session.itineraryId) session.itineraryId = itineraryId
  session.lastActiveAt = new Date()
  if (session.title === "New chat" && userContent) {
    session.title = userContent.slice(0, 60) + (userContent.length > 60 ? "…" : "")
  }
  await session.save()
  return session
}

/**
 * Main copilot turn — context-aware, tool-calling, session persistence.
 */
export async function runCopilotChat({
  messages,
  userId,
  sessionId,
  itineraryId,
  itinerarySnapshot,
  signal,
}) {
  const validMessages = (messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .map((m) => ({ role: m.role, content: String(m.content).trim().slice(0, 4000) }))

  if (validMessages.length === 0) {
    const err = new Error("At least one message is required")
    err.clientStatus = 400
    throw err
  }

  if (signal?.aborted) {
    const err = new Error("Request cancelled")
    err.clientStatus = 499
    throw err
  }

  let itinerary = itinerarySnapshot || null
  if (!itinerary && itineraryId) itinerary = await loadItinerarySnapshot(itineraryId)

  let session = null
  if (sessionId && userId) {
    session = await ChatSession.findOne({ _id: sessionId, userId })
    if (session?.planDraft && !itinerary) {
      /* keep plan draft in context */
    }
  }

  const expenses = userId && (itineraryId || itinerary?.id)
    ? await loadExpenseSummary(userId, itineraryId || itinerary?.id)
    : null

  const ctx = {
    userId,
    itineraryId: itineraryId || itinerary?.id,
    itinerary,
    expenses,
    planDraft: session?.planDraft || null,
  }

  const contextBlock = buildCopilotContextBlock({
    itinerary,
    expenses,
    planDraft: ctx.planDraft,
  })

  const lastUser = [...validMessages].reverse().find((m) => m.role === "user")?.content || ""
  const user = `${contextBlock ? `Context:\n${contextBlock}\n\n` : ""}Conversation:\n${formatMessages(validMessages)}\n\nRespond to the latest user message. Pick tools when needed.`

  let demo = true
  let parsed = null

  try {
    const llm = await llmChatJson({ system: COPILOT_SYSTEM, user })
    demo = llm.demo
    parsed = normalizeCopilotResponse(llm.parsed)
  } catch (err) {
    console.warn("[copilot] LLM error:", err.message)
  }

  if (!parsed?.reply) {
    parsed = demoCopilotReply(validMessages, ctx)
    demo = true
  }

  if (signal?.aborted) {
    const err = new Error("Request cancelled")
    err.clientStatus = 499
    throw err
  }

  let toolResults = { results: [], cards: [], itineraryUpdated: false, updatedItinerary: null }
  if (parsed.toolCalls?.length > 0) {
    toolResults = await executeToolCalls(parsed.toolCalls, ctx)
    if (toolResults.updatedItinerary) itinerary = toolResults.updatedItinerary
  }

  const allCards = [...(parsed.cards || []), ...(toolResults.cards || [])]

  const defaultQuickActions = []
  if (parsed.planDraft) {
    defaultQuickActions.push({ id: "generate_itinerary", label: "Generate itinerary", payload: parsed.planDraft })
  }
  if (itinerary || itineraryId) {
    defaultQuickActions.push({ id: "open_map", label: "Open map", payload: { itineraryId: itineraryId || itinerary?.id } })
    defaultQuickActions.push({ id: "download_pdf", label: "Download PDF", payload: { itineraryId: itineraryId || itinerary?.id } })
  }

  const response = {
    demo,
    reply: parsed.reply,
    planDraft: parsed.planDraft,
    cards: allCards,
    followUps: parsed.followUps?.length ? parsed.followUps : ["Show weather?", "Find cheaper hotels?", "Optimize itinerary?"],
    quickActions: [...(parsed.quickActions || []), ...defaultQuickActions].slice(0, 8),
    itineraryUpdated: toolResults.itineraryUpdated,
    itinerary: toolResults.updatedItinerary || (toolResults.itineraryUpdated ? itinerary : undefined),
    sessionId: sessionId || undefined,
  }

  if (userId) {
    const saved = await saveSessionMessages(
      sessionId,
      userId,
      lastUser,
      response,
      itineraryId || itinerary?.id,
    )
    if (saved) response.sessionId = String(saved._id)
  }

  return response
}

/** Chunk text for SSE streaming simulation (Feature 16). */
export function chunkTextForStream(text, chunkSize = 12) {
  const words = String(text || "").split(/(\s+)/)
  const chunks = []
  let buf = ""
  for (const w of words) {
    if (buf.length + w.length > chunkSize && buf) {
      chunks.push(buf)
      buf = w
    } else {
      buf += w
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}
