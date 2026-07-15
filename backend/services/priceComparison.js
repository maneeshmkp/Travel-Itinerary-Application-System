import { roundMoney } from "../utils/budgetCalculator.js"

function hashNum(seed, min, max) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const range = max - min
  return min + (Math.abs(h) % range)
}

function estimateCheaperAlternative(name, currentPrice, type) {
  const discount = type === "hotel" ? 0.22 : type === "restaurant" ? 0.35 : 0.4
  const suggested = roundMoney(currentPrice * (1 - discount))
  const savings = roundMoney(currentPrice - suggested)
  return { suggested, savings }
}

/**
 * Build price comparisons from bookings, activities, and nearby context.
 */
export function buildPriceComparisons(ctx = {}) {
  const comparisons = []
  const currency = ctx.currency || "INR"
  const destination = ctx.destination || "destination"

  for (const booking of ctx.bookings || []) {
    const price = Number(booking.price || 0)
    if (price <= 0) continue

    if (booking.bookingType === "hotel") {
      const altName = `Budget stay near ${destination}`
      const { suggested, savings } = estimateCheaperAlternative(booking.provider, price, "hotel")
      comparisons.push({
        type: "hotel",
        currentName: booking.provider || "Current hotel",
        suggestedName: altName,
        currentPrice: price,
        suggestedPrice: suggested,
        savings,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=hotels+near+${encodeURIComponent(destination)}`,
        currency,
        bookingId: String(booking._id),
      })
    }

    if (booking.bookingType === "flight") {
      const savings = roundMoney(price * 0.12)
      comparisons.push({
        type: "flight",
        currentName: `${booking.provider || "Airline"} ${booking.flightNumber || ""}`.trim(),
        suggestedName: "Earlier booking / alternate airline",
        currentPrice: price,
        suggestedPrice: roundMoney(price - savings),
        savings,
        mapsUrl: "",
        currency,
        bookingId: String(booking._id),
      })
    }
  }

  const activities = ctx.activities || []
  const paidActivities = activities.filter((a) => !a.skipped && Number(a.cost) > 200)
  for (const act of paidActivities.slice(0, 5)) {
    const price = Number(act.cost)
    const freeAlt = act.category === "relaxation" ? "Public beach / park" : "Free walking tour / museum day"
    const suggested = roundMoney(price * 0.55)
    comparisons.push({
      type: "activity",
      currentName: act.name,
      suggestedName: freeAlt,
      currentPrice: price,
      suggestedPrice: suggested,
      savings: roundMoney(price - suggested),
      mapsUrl: act.latitude && act.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=free+attractions+${encodeURIComponent(destination)}`,
      currency,
      activityId: String(act._id || act.id || ""),
      affectedDay: act.dayNumber,
    })
  }

  const transportPlanned = (ctx.expenseReport?.byCategory || []).find((c) => c.id === "transport")
  if (transportPlanned && transportPlanned.planned > 500) {
    const current = transportPlanned.planned
    const savings = roundMoney(current * 0.45)
    comparisons.push({
      type: "transport",
      currentName: "Taxi / private cab",
      suggestedName: "Metro + walking",
      currentPrice: current,
      suggestedPrice: roundMoney(current - savings),
      savings,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=public+transport+${encodeURIComponent(destination)}`,
      currency,
    })
  }

  const diningPlanned = (ctx.expenseReport?.byCategory || []).find((c) => c.id === "food")
  if (diningPlanned && diningPlanned.planned > 300) {
    const current = diningPlanned.planned
    const savings = roundMoney(current * 0.25)
    comparisons.push({
      type: "food",
      currentName: "Tourist restaurants",
      suggestedName: "Local eateries / street food",
      currentPrice: current,
      suggestedPrice: roundMoney(current - savings),
      savings,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=local+restaurants+${encodeURIComponent(destination)}`,
      currency,
    })
  }

  if (!comparisons.length && ctx.currentBudget > 0) {
    const savings = roundMoney(ctx.currentBudget * 0.15)
    comparisons.push({
      type: "misc",
      currentName: "Current plan",
      suggestedName: "Optimized mix",
      currentPrice: ctx.currentBudget,
      suggestedPrice: roundMoney(ctx.currentBudget - savings),
      savings,
      mapsUrl: "",
      currency,
    })
  }

  return comparisons.sort((a, b) => b.savings - a.savings)
}

/**
 * Deterministic nearby price hints when Google Places is unavailable.
 */
export function estimateNearbyAlternatives(destination, category, count = 3) {
  const items = []
  for (let i = 0; i < count; i++) {
    const base = hashNum(`${destination}-${category}-${i}`, 400, 2500)
    items.push({
      name: `${category} option ${i + 1} near ${destination}`,
      estimatedPrice: base,
      rating: (3.5 + (i * 0.3)).toFixed(1),
    })
  }
  return items
}
