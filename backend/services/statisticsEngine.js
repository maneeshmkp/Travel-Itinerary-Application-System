import Itinerary from "../models/Itinerary.js"
import TripExpense from "../models/TripExpense.js"
import Booking from "../models/Booking.js"
import Review from "../models/Review.js"
import PackingList from "../models/PackingList.js"
import BudgetOptimization from "../models/BudgetOptimization.js"
import { normalizeCost } from "../utils/budgetCalculations.js"
import { ACHIEVEMENT_META } from "../constants/travelAnalytics.js"
import {
  deriveTripStatus,
  computeTripDistanceKm,
  parseGeoFromDestination,
  buildHeatmapEntries,
  buildTimeline,
  roundMoney,
  computeTravelScore,
} from "../utils/travelCalculator.js"

function modeMap(map) {
  let best = ""
  let max = 0
  for (const [k, v] of map.entries()) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return best
}

function tripBudget(trip) {
  return normalizeCost(trip.budget?.max ?? trip.totalBudget ?? 0)
}

function filterByYear(items, year, dateFn) {
  return items.filter((item) => {
    const d = dateFn(item)
    return d && d.getFullYear() === Number(year)
  })
}

function filterByMonth(items, monthKey, dateFn) {
  return items.filter((item) => {
    const d = dateFn(item)
    if (!d) return false
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    return key === monthKey
  })
}

function computeAchievements(ctx) {
  const unlocked = []
  const now = new Date()

  const add = (id) => {
    const meta = ACHIEVEMENT_META[id]
    if (meta) unlocked.push({ id, ...meta, unlockedAt: now })
  }

  if (ctx.totalTrips >= 1) add("first_trip")
  if (ctx.adventureTrips >= 3) add("adventure_lover")
  if (ctx.beachTrips >= 1) add("beach_explorer")
  if (ctx.budgetHealthAvg >= 80) add("budget_master")
  if (ctx.weekendTrips >= 2) add("weekend_traveller")
  if (ctx.internationalTrips >= 1) add("international_traveller")
  if (ctx.citiesVisited.length >= 10) add("explorer_10")
  if (ctx.flightBookings >= 5) add("frequent_flyer")
  if (ctx.maxPackingCompletion >= 80) add("packing_pro")
  if (ctx.reviewCount >= 3) add("reviewer")

  return unlocked
}

function buildCharts(ctx) {
  const tripsPerMonth = new Map()
  for (const t of ctx.trips) {
    const d = t.startDate ? new Date(t.startDate) : new Date(t.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    tripsPerMonth.set(key, (tripsPerMonth.get(key) || 0) + 1)
  }

  const moneyByMonth = new Map()
  for (const e of ctx.expenses) {
    const d = new Date(e.spentAt || e.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    moneyByMonth.set(key, roundMoney((moneyByMonth.get(key) || 0) + normalizeCost(e.amount)))
  }

  const budgetVsActual = ctx.trips.slice(0, 12).map((t) => {
    const tid = String(t._id)
    const planned = tripBudget(t)
    const actual = ctx.expensesByTrip.get(tid) || 0
    return { trip: t.title, planned, actual }
  })

  const countryCounts = new Map()
  for (const c of ctx.countriesVisited) {
    countryCounts.set(c, (countryCounts.get(c) || 0) + 1)
  }

  const categoryCounts = new Map()
  for (const t of ctx.trips) {
    for (const tag of t.tags || []) {
      categoryCounts.set(tag, (categoryCounts.get(tag) || 0) + 1)
    }
    for (const day of t.days || []) {
      for (const act of day.activities || []) {
        if (act?.category) {
          categoryCounts.set(act.category, (categoryCounts.get(act.category) || 0) + 1)
        }
      }
    }
  }

  const travelDaysByMonth = new Map()
  for (const t of ctx.trips) {
    const d = t.startDate ? new Date(t.startDate) : new Date(t.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    travelDaysByMonth.set(key, (travelDaysByMonth.get(key) || 0) + (t.totalDays || 0))
  }

  const savingsByMonth = new Map()
  for (const b of ctx.budgetOpts) {
    const d = new Date(b.analyzedAt || b.updatedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    savingsByMonth.set(key, roundMoney((savingsByMonth.get(key) || 0) + normalizeCost(b.potentialSavings)))
  }

  const sortEntries = (m) =>
    [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ label: k, value: v }))

  return {
    tripsPerMonth: sortEntries(tripsPerMonth),
    moneySpent: sortEntries(moneyByMonth),
    budgetVsActual,
    countries: [...countryCounts.entries()].map(([name, value]) => ({ name, value })),
    categories: [...categoryCounts.entries()].map(([name, value]) => ({ name, value })),
    travelDays: sortEntries(travelDaysByMonth),
    savings: sortEntries(savingsByMonth),
  }
}

function buildYearComparison(ctx, year) {
  const y = Number(year) || new Date().getFullYear()
  const prev = y - 1

  const yearTrips = ctx.trips.filter((t) => {
    const d = t.startDate ? new Date(t.startDate) : new Date(t.createdAt)
    return d.getFullYear() === y
  })
  const prevTrips = ctx.trips.filter((t) => {
    const d = t.startDate ? new Date(t.startDate) : new Date(t.createdAt)
    return d.getFullYear() === prev
  })

  const sumBudget = (trips) => roundMoney(trips.reduce((s, t) => s + tripBudget(t), 0) / Math.max(1, trips.length))
  const countries = (trips) => new Set(trips.flatMap((t) => parseGeoFromDestination(t.destination).country)).size

  return {
    currentYear: y,
    previousYear: prev,
    current: {
      trips: yearTrips.length,
      budget: sumBudget(yearTrips),
      savings: roundMoney(
        ctx.budgetOpts
          .filter((b) => new Date(b.analyzedAt || b.updatedAt).getFullYear() === y)
          .reduce((s, b) => s + normalizeCost(b.potentialSavings), 0),
      ),
      countries: countries(yearTrips),
      distance: roundMoney(yearTrips.reduce((s, t) => s + computeTripDistanceKm(t), 0)),
    },
    previous: {
      trips: prevTrips.length,
      budget: sumBudget(prevTrips),
      savings: roundMoney(
        ctx.budgetOpts
          .filter((b) => new Date(b.analyzedAt || b.updatedAt).getFullYear() === prev)
          .reduce((s, b) => s + normalizeCost(b.potentialSavings), 0),
      ),
      countries: countries(prevTrips),
      distance: roundMoney(prevTrips.reduce((s, t) => s + computeTripDistanceKm(t), 0)),
    },
  }
}

async function loadUserTravelData(userId) {
  const trips = await Itinerary.find({ ownerId: userId })
    .populate({ path: "days", populate: { path: "activities", model: "Activity" } })
    .lean()

  const [expenses, bookings, reviews, packingLists, budgetOpts] = await Promise.all([
    TripExpense.find({ userId }).lean(),
    Booking.find({ userId }).lean(),
    Review.find({ userId }).lean(),
    PackingList.find({ userId }).lean(),
    BudgetOptimization.find({ userId }).lean(),
  ])

  return { trips, expenses, bookings, reviews, packingLists, budgetOpts }
}

function buildStatisticsFromData({ trips, expenses, bookings, reviews, packingLists, budgetOpts }, filters = {}) {
  let filteredTrips = trips
  if (filters.year) {
    filteredTrips = filterByYear(filteredTrips, filters.year, (t) =>
      t.startDate ? new Date(t.startDate) : new Date(t.createdAt),
    )
  }
  if (filters.month) {
    filteredTrips = filterByMonth(filteredTrips, filters.month, (t) =>
      t.startDate ? new Date(t.startDate) : new Date(t.createdAt),
    )
  }

  const expensesByTrip = new Map()
  for (const e of expenses) {
    const tid = String(e.itineraryId)
    expensesByTrip.set(tid, roundMoney((expensesByTrip.get(tid) || 0) + normalizeCost(e.amount)))
  }

  const statusCounts = { completed: 0, cancelled: 0, upcoming: 0, active: 0, planned: 0 }
  const destCounts = new Map()
  const countrySet = new Set()
  const stateSet = new Set()
  const citySet = new Set()
  let totalTravelDays = 0
  let totalDistance = 0
  let adventureTrips = 0
  let beachTrips = 0
  let weekendTrips = 0
  let internationalTrips = 0

  const countryCounts = new Map()
  for (const trip of filteredTrips) {
    const geo = parseGeoFromDestination(trip.destination)
    if (geo.country && geo.country !== "Unknown") {
      countryCounts.set(geo.country, (countryCounts.get(geo.country) || 0) + 1)
    }
  }

  const tripSnapshots = []

  for (const trip of filteredTrips) {
    const status = deriveTripStatus(trip, bookings)
    trip._derivedStatus = status
    statusCounts[status] = (statusCounts[status] || 0) + 1

    const geo = parseGeoFromDestination(trip.destination)
    countrySet.add(geo.country)
    if (geo.state) stateSet.add(geo.state)
    geo.cities.forEach((c) => citySet.add(c))

    destCounts.set(trip.destination, (destCounts.get(trip.destination) || 0) + 1)
    totalTravelDays += Number(trip.totalDays) || 0
    totalDistance += computeTripDistanceKm(trip)

    if ((trip.tags || []).includes("adventure")) adventureTrips += 1
    if ((trip.tags || []).includes("beach")) beachTrips += 1
    if ((trip.totalDays || 0) <= 3) weekendTrips += 1
    if (geo.country && geo.country !== "India" && geo.country !== "Unknown") internationalTrips += 1

    const tid = String(trip._id)
    const spent = expensesByTrip.get(tid) || 0
    tripSnapshots.push({
      id: tid,
      title: trip.title,
      destination: trip.destination,
      budget: tripBudget(trip),
      spent,
      totalDays: trip.totalDays,
      status,
    })
  }

  const totalSpent = roundMoney(expenses.reduce((s, e) => s + normalizeCost(e.amount), 0))
  const budgets = filteredTrips.map(tripBudget).filter((b) => b > 0)
  const averageBudget = budgets.length ? roundMoney(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0
  const actuals = [...expensesByTrip.values()].filter((v) => v > 0)
  const averageActualExpense = actuals.length ? roundMoney(actuals.reduce((a, b) => a + b, 0) / actuals.length) : 0

  const ratings = reviews.map((r) => r.rating)
  const averageRating = ratings.length ? roundMoney(ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0

  const moneySaved = roundMoney(budgetOpts.reduce((s, b) => s + normalizeCost(b.potentialSavings), 0))

  const tagCounts = new Map()
  for (const t of filteredTrips) {
    for (const tag of t.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  const activityCategoryCounts = new Map()
  for (const t of filteredTrips) {
    for (const day of t.days || []) {
      for (const act of day.activities || []) {
        if (act?.category) {
          activityCategoryCounts.set(act.category, (activityCategoryCounts.get(act.category) || 0) + 1)
        }
      }
    }
  }

  const favoriteCategory = modeMap(activityCategoryCounts) || modeMap(tagCounts) || ""

  const bySpent = [...tripSnapshots].sort((a, b) => b.spent - a.spent)
  const byBudget = [...tripSnapshots].sort((a, b) => b.budget - a.budget)
  const byDays = [...tripSnapshots].sort((a, b) => b.totalDays - a.totalDays)

  const packingCompletions = packingLists.map((p) => {
    const total = Object.values(p.categories || {}).flat().length + (p.customItems || []).length
    const packed = Object.values(p.categories || {})
      .flat()
      .filter((i) => i.packed).length + (p.customItems || []).filter((i) => i.packed).length
    return total > 0 ? Math.round((packed / total) * 100) : 0
  })
  const maxPackingCompletion = packingCompletions.length ? Math.max(...packingCompletions) : 0
  const packingCompletionAvg = packingCompletions.length
    ? Math.round(packingCompletions.reduce((a, b) => a + b, 0) / packingCompletions.length)
    : 0

  const budgetHealthScores = budgetOpts.map((b) => b.healthScore).filter((s) => s > 0)
  const budgetHealthAvg = budgetHealthScores.length
    ? Math.round(budgetHealthScores.reduce((a, b) => a + b, 0) / budgetHealthScores.length)
    : 70

  const flightBookings = bookings.filter((b) => b.bookingType === "flight").length

  const ctx = {
    trips: filteredTrips,
    expenses,
    bookings,
    reviews,
    packingLists,
    budgetOpts,
    expensesByTrip,
    totalTrips: filteredTrips.length,
    completedTrips: statusCounts.completed,
    cancelledTrips: statusCounts.cancelled,
    upcomingTrips: statusCounts.upcoming,
    countriesVisited: [...countrySet].filter((c) => c && c !== "Unknown"),
    statesVisited: [...stateSet],
    citiesVisited: [...citySet],
    totalTravelDays,
    totalDistance: roundMoney(totalDistance),
    totalSpent,
    averageBudget,
    averageActualExpense,
    favoriteDestination: modeMap(destCounts),
    favoriteCountry: modeMap(countryCounts),
    favoriteCategory,
    mostExpensiveTrip: bySpent[0] || byBudget[0] || null,
    cheapestTrip: bySpent.length ? bySpent[bySpent.length - 1] : null,
    longestTrip: byDays[0] || null,
    shortestTrip: byDays.length ? byDays[byDays.length - 1] : null,
    moneySaved,
    averageRating,
    adventureTrips,
    beachTrips,
    weekendTrips,
    internationalTrips,
    flightBookings,
    maxPackingCompletion,
    packingCompletionAvg,
    budgetHealthAvg,
    reviewCount: reviews.length,
  }

  const travelScore = computeTravelScore({
    completedTrips: ctx.completedTrips,
    totalTrips: ctx.totalTrips,
    budgetHealthAvg: ctx.budgetHealthAvg,
    averageRating: ctx.averageRating,
    packingCompletionAvg: ctx.packingCompletionAvg,
    countriesCount: ctx.countriesVisited.length,
    reviewCount: ctx.reviewCount,
    moneySaved: ctx.moneySaved,
  })

  return {
    ...ctx,
    travelScore: travelScore.score,
    travelScoreLabel: travelScore.label,
    achievements: computeAchievements(ctx),
    charts: buildCharts(ctx),
    heatmap: buildHeatmapEntries(filteredTrips),
    timeline: buildTimeline(filteredTrips),
    yearComparison: buildYearComparison({ trips, expenses, bookings, reviews, packingLists, budgetOpts, expensesByTrip: expensesByTrip }, filters.year || new Date().getFullYear()),
  }
}

export async function computeUserStatistics(userId, filters = {}) {
  const data = await loadUserTravelData(userId)
  return buildStatisticsFromData(data, filters)
}

export { loadUserTravelData, buildStatisticsFromData }
