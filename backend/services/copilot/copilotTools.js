import { getWeatherForecast, getWeatherForDate } from "../weatherService.js"
import { getHotelsAvailability, getFlightsAvailability } from "../availabilityService.js"
import { searchGoogleMaps, isSerpApiConfigured } from "../serpApiClient.js"
import { geocodePlace } from "../geocodingService.js"
import { applyItineraryMutation } from "./itineraryMutations.js"
import { loadItinerarySnapshot, loadExpenseSummary } from "./copilotContext.js"
import { createTripExpense } from "../expenseService.js"
import { computeBudgetInsight } from "../../utils/budgetCalculations.js"
import { cacheKey, getCached, setCached } from "./copilotCache.js"
import Itinerary from "../../models/Itinerary.js"

const TOOL_DEFINITIONS = [
  { name: "get_weather", description: "Get weather forecast or tomorrow's weather for destination" },
  { name: "search_flights", description: "Search flights via SerpAPI" },
  { name: "search_hotels", description: "Search hotels with price/rating filters" },
  { name: "search_nearby_places", description: "Find restaurants, ATMs, hospitals, etc. near a location" },
  { name: "modify_itinerary", description: "Edit saved itinerary: remove/add/move activities, swap days, replace hotel, update budget" },
  { name: "get_budget_summary", description: "Recalculate trip budget, daily cost, remaining budget vs expenses" },
  { name: "add_expense", description: "Log a trip expense" },
  { name: "get_expense_summary", description: "Show planned vs actual spending" },
  { name: "map_action", description: "Return map UI instructions: zoom to day, highlight hotel, show markers" },
]

export function getToolDefinitions() {
  return TOOL_DEFINITIONS
}

async function toolGetWeather(args, ctx) {
  const destination = args.destination || ctx.itinerary?.destination
  if (!destination) return { error: "No destination for weather lookup" }

  const key = cacheKey(["weather", destination, args.date, args.days])
  const cached = getCached(key)
  if (cached) return cached

  try {
    let result
    if (args.tomorrow || args.date === "tomorrow") {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().slice(0, 10)
      result = await getWeatherForDate(destination, dateStr)
    } else if (args.days) {
      result = await getWeatherForecast(destination, args.days || 5, args.startDate)
    } else {
      result = await getWeatherForDate(destination, args.date)
    }
    const card = {
      type: "weather",
      data: {
        destination,
        forecast: result,
        tip: result?.tip || result?.summary || null,
      },
    }
    const out = { success: true, card, summary: JSON.stringify(result).slice(0, 1500) }
    setCached(key, out)
    return out
  } catch (err) {
    return { error: err.message || "Weather unavailable", userMessage: "Weather data is temporarily unavailable." }
  }
}

async function toolSearchFlights(args, ctx) {
  const destination = args.destination || ctx.itinerary?.destination
  if (!destination) return { error: "Destination required for flight search" }

  const key = cacheKey(["flights", destination, args.origin, args.date, args.sortBy])
  const cached = getCached(key)
  if (cached) return cached

  try {
    const data = await getFlightsAvailability({
      destination,
      origin: args.origin || "DEL",
      date: args.date,
      passengers: args.passengers || 1,
      currency: args.currency || "INR",
    })
    let flights = [...(data.data || [])]
    if (args.morning) {
      flights = flights.filter((f) => /am|morning|0[5-9]:|1[01]:/i.test(String(f.departure || f.time || "")))
    }
    if (args.sortBy === "price") flights.sort((a, b) => (a.price || 0) - (b.price || 0))
    flights = flights.slice(0, args.limit || 5)

    const card = { type: "flight", data: { destination, flights, source: data.source } }
    const out = { success: true, card, summary: `${flights.length} flights found` }
    setCached(key, out)
    return out
  } catch (err) {
    return { error: err.message, userMessage: "Could not fetch flights right now. Try again shortly." }
  }
}

async function toolSearchHotels(args, ctx) {
  const destination = args.destination || ctx.itinerary?.destination
  if (!destination) return { error: "Destination required for hotel search" }

  const key = cacheKey(["hotels", destination, args.maxPrice, args.minRating, args.sortBy])
  const cached = getCached(key)
  if (cached) return cached

  try {
    const data = await getHotelsAvailability({
      destination,
      nights: args.nights || ctx.itinerary?.numberOfNights || 2,
      currency: args.currency || "INR",
    })
    let hotels = [...(data.data || [])]
    if (args.maxPrice) hotels = hotels.filter((h) => (h.price || h.rate || 999999) <= Number(args.maxPrice))
    if (args.minRating) hotels = hotels.filter((h) => (h.rating || 0) >= Number(args.minRating))
    if (args.sortBy === "price") hotels.sort((a, b) => (a.price || a.rate || 0) - (b.price || b.rate || 0))
    if (args.sortBy === "rating") hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    hotels = hotels.slice(0, args.limit || 5)

    const card = { type: "hotel", data: { destination, hotels, source: data.source } }
    const out = { success: true, card, summary: `${hotels.length} hotels found` }
    setCached(key, out)
    return out
  } catch (err) {
    return { error: err.message, userMessage: "Hotel search is temporarily unavailable." }
  }
}

async function toolSearchNearby(args, ctx) {
  const placeType = args.type || args.placeType || "restaurant"
  const near = args.near || args.location || ctx.itinerary?.days?.[0]?.hotel?.location || ctx.itinerary?.destination
  if (!near) return { error: "Location required for nearby search" }

  const key = cacheKey(["places", near, placeType])
  const cached = getCached(key)
  if (cached) return cached

  try {
    let places = []
    if (isSerpApiConfigured()) {
      const q = `${placeType} near ${near}`
      const data = await searchGoogleMaps({ q, type: "search" })
      places = (data.local_results || data.place_results || []).slice(0, args.limit || 8).map((p) => ({
        name: p.title || p.name,
        address: p.address,
        rating: p.rating,
        type: placeType,
        latitude: p.gps_coordinates?.latitude,
        longitude: p.gps_coordinates?.longitude,
      }))
    } else {
      const geo = await geocodePlace(near)
      places = [{ name: `${placeType} near ${near}`, address: near, latitude: geo?.latitude, longitude: geo?.longitude }]
    }
    const card = {
      type: "place",
      data: { query: placeType, near, places },
    }
    const mapCard = places.some((p) => p.latitude)
      ? {
          type: "map",
          data: {
            action: "show_markers",
            markers: places.filter((p) => p.latitude).map((p) => ({
              lat: p.latitude,
              lng: p.longitude,
              label: p.name,
            })),
            center: places[0] ? { lat: places[0].latitude, lng: places[0].longitude } : null,
          },
        }
      : null
    const out = {
      success: true,
      cards: mapCard ? [card, mapCard] : [card],
      card,
      summary: `Found ${places.length} ${placeType}(s) near ${near}`,
    }
    setCached(key, out)
    return out
  } catch (err) {
    return { error: err.message, userMessage: "Nearby places search failed." }
  }
}

async function toolModifyItinerary(args, ctx) {
  const itineraryId = args.itineraryId || ctx.itineraryId || ctx.itinerary?.id
  if (!itineraryId) return { error: "No itinerary linked to modify" }

  try {
    const updated = await applyItineraryMutation(itineraryId, args)
    const card = {
      type: "itinerary",
      data: { action: args.action, itinerary: updated },
    }
    return {
      success: true,
      card,
      itineraryUpdated: true,
      itinerary: updated,
      summary: `Itinerary updated: ${args.action}`,
    }
  } catch (err) {
    return { error: err.message, userMessage: err.message }
  }
}

async function toolBudgetSummary(args, ctx) {
  const itineraryId = args.itineraryId || ctx.itineraryId || ctx.itinerary?.id
  let snap = ctx.itinerary
  if (itineraryId && !snap) snap = await loadItinerarySnapshot(itineraryId)
  if (!snap && ctx.planDraft) {
    const pd = ctx.planDraft
    const card = {
      type: "budget",
      data: {
        planned: pd.budget,
        totalEstimated: pd.budget?.max,
        costPerDay: pd.budget?.max ? Math.round(pd.budget.max / (pd.numberOfNights + 1)) : null,
        currency: pd.budget?.currency || "INR",
        source: "plan_draft",
      },
    }
    return { success: true, card, summary: "Budget from in-progress plan" }
  }
  if (!snap) return { error: "No itinerary for budget summary" }

  const expenses = ctx.expenses || (ctx.userId ? await loadExpenseSummary(ctx.userId, itineraryId) : null)
  const insight = snap.budgetInsight || computeBudgetInsight(snap)
  const plannedMax = snap.budget?.max ?? insight.totalBudget
  const remaining = expenses ? plannedMax - expenses.totalSpent : plannedMax - insight.totalBudget

  const card = {
    type: "budget",
    data: {
      planned: snap.budget,
      totalEstimated: insight.totalBudget,
      costPerDay: insight.costPerDay,
      currency: insight.currency || snap.budget?.currency,
      expenses: expenses || null,
      remaining: Math.round(remaining * 100) / 100,
      byDay: insight.byDay,
    },
  }
  return { success: true, card, summary: `Total ~${insight.totalBudget}, ${insight.costPerDay}/day` }
}

async function toolAddExpense(args, ctx) {
  const itineraryId = args.itineraryId || ctx.itineraryId || ctx.itinerary?.id
  if (!itineraryId || !ctx.userId) return { error: "Login and link an itinerary to log expenses" }

  const amount = Number(args.amount)
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valid expense amount required" }

  try {
    const expense = await createTripExpense(ctx.userId, itineraryId, {
      amount,
      currency: args.currency || ctx.itinerary?.budget?.currency,
      category: args.category || "misc",
      description: args.description || args.note || "Expense",
      dayNumber: args.dayNumber || 1,
      paymentMethod: args.paymentMethod,
    })
    const summary = await loadExpenseSummary(ctx.userId, itineraryId)
    const card = { type: "budget", data: { expenseAdded: expense, expenses: summary } }
    return { success: true, card, summary: `Logged ${amount} expense` }
  } catch (err) {
    return { error: err.message || "Could not log expense" }
  }
}

async function toolExpenseSummary(args, ctx) {
  const itineraryId = args.itineraryId || ctx.itineraryId || ctx.itinerary?.id
  if (!itineraryId || !ctx.userId) return { error: "No expense data" }
  const summary = await loadExpenseSummary(ctx.userId, itineraryId)
  const it = await Itinerary.findById(itineraryId).lean()
  const insight = it ? computeBudgetInsight(it) : null
  const card = {
    type: "budget",
    data: {
      planned: it?.budget,
      totalEstimated: insight?.totalBudget,
      expenses: summary,
      remaining: (it?.budget?.max || insight?.totalBudget || 0) - summary.totalSpent,
    },
  }
  return { success: true, card, summary: `Spent ${summary.totalSpent} of planned budget` }
}

async function toolMapAction(args, ctx) {
  const snap = ctx.itinerary
  if (!snap) return { error: "No itinerary for map actions" }

  const action = args.action || "show_day"
  const dayNumber = args.dayNumber || args.day
  const markers = []
  let center = null

  if (action === "show_day" || action === "zoom_day") {
    const day = snap.days?.find((d) => Number(d.dayNumber) === Number(dayNumber))
    if (day) {
      for (const a of day.activities || []) {
        if (a.latitude && a.longitude) {
          markers.push({ lat: a.latitude, lng: a.longitude, label: a.name, dayNumber: day.dayNumber })
        }
      }
      if (markers[0]) center = { lat: markers[0].lat, lng: markers[0].lng }
    }
  } else if (action === "highlight_hotel") {
    const day = snap.days?.find((d) => Number(d.dayNumber) === Number(dayNumber || 1))
    if (day?.hotel) {
      const geo = await geocodePlace(`${day.hotel.name} ${day.hotel.location}`)
      if (geo) {
        center = { lat: geo.latitude, lng: geo.longitude }
        markers.push({ lat: geo.latitude, lng: geo.longitude, label: day.hotel.name, type: "hotel" })
      }
    }
  } else if (action === "show_today" || action === "show_activities") {
    const day = snap.days?.[0]
    for (const a of day?.activities || []) {
      if (a.latitude && a.longitude) {
        markers.push({ lat: a.latitude, lng: a.longitude, label: a.name })
      }
    }
    if (markers[0]) center = { lat: markers[0].lat, lng: markers[0].lng }
  }

  const card = {
    type: "map",
    data: { action, dayNumber, markers, center, zoom: args.zoom || 13 },
  }
  return { success: true, card, summary: `Map: ${action}` }
}

const EXECUTORS = {
  get_weather: toolGetWeather,
  search_flights: toolSearchFlights,
  search_hotels: toolSearchHotels,
  search_nearby_places: toolSearchNearby,
  modify_itinerary: toolModifyItinerary,
  get_budget_summary: toolBudgetSummary,
  add_expense: toolAddExpense,
  get_expense_summary: toolExpenseSummary,
  map_action: toolMapAction,
}

export async function executeTool(toolName, args, ctx) {
  const fn = EXECUTORS[toolName]
  if (!fn) return { error: `Unknown tool: ${toolName}` }
  try {
    return await fn(args || {}, ctx)
  } catch (err) {
    return { error: err.message || "Tool failed", userMessage: "Something went wrong running that action." }
  }
}

export async function executeToolCalls(toolCalls, ctx) {
  const results = []
  const cards = []
  let itineraryUpdated = false
  let updatedItinerary = null

  for (const call of toolCalls || []) {
    const name = call.tool || call.name
    const result = await executeTool(name, call.args || call.arguments || {}, ctx)
    results.push({ tool: name, result })
    if (result.card) cards.push(result.card)
    if (result.cards) cards.push(...result.cards)
    if (result.itineraryUpdated) {
      itineraryUpdated = true
      updatedItinerary = result.itinerary
    }
  }

  return { results, cards, itineraryUpdated, updatedItinerary }
}
