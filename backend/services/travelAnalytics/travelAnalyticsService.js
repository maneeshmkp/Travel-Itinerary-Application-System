import TravelAnalytics from "../../models/TravelAnalytics.js"
import { computeUserStatistics } from "../statisticsEngine.js"
import { generateAIInsights } from "../travelInsights.js"
import { notifyTravelMilestone } from "../notifications/notificationTriggers.js"
import { buildAnalysisHash, serializeTravelAnalytics, roundMoney } from "../../utils/travelCalculator.js"

const cache = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000

function dashboardFromStats(stats, serialized = null) {
  const base = serialized || {}
  return {
    exists: true,
    ...base,
    ...stats,
    stats: {
      totalTrips: stats.totalTrips,
      completedTrips: stats.completedTrips,
      cancelledTrips: stats.cancelledTrips,
      upcomingTrips: stats.upcomingTrips,
      countriesVisited: stats.countriesVisited,
      statesVisited: stats.statesVisited,
      citiesVisited: stats.citiesVisited,
      totalTravelDays: stats.totalTravelDays,
      totalSpent: stats.totalSpent,
      averageBudget: stats.averageBudget,
      averageActualExpense: stats.averageActualExpense,
      favoriteDestination: stats.favoriteDestination,
      favoriteCountry: stats.favoriteCountry,
      favoriteCategory: stats.favoriteCategory,
      mostExpensiveTrip: stats.mostExpensiveTrip,
      cheapestTrip: stats.cheapestTrip,
      longestTrip: stats.longestTrip,
      shortestTrip: stats.shortestTrip,
      totalDistance: stats.totalDistance,
      moneySaved: stats.moneySaved,
      averageRating: stats.averageRating,
    },
  }
}

async function persistAnalytics(userId, stats, hash) {
  const previous = await TravelAnalytics.findOne({ userId }).lean()
  const cityCount = stats.citiesVisited?.length || 0
  const prevCityCount = previous?.citiesVisited?.length || 0

  const doc = await TravelAnalytics.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        totalTrips: stats.totalTrips,
        completedTrips: stats.completedTrips,
        cancelledTrips: stats.cancelledTrips,
        upcomingTrips: stats.upcomingTrips,
        countriesVisited: stats.countriesVisited,
        statesVisited: stats.statesVisited,
        citiesVisited: stats.citiesVisited,
        totalTravelDays: stats.totalTravelDays,
        totalSpent: stats.totalSpent,
        averageBudget: stats.averageBudget,
        averageActualExpense: stats.averageActualExpense,
        favoriteDestination: stats.favoriteDestination,
        favoriteCountry: stats.favoriteCountry,
        favoriteCategory: stats.favoriteCategory,
        mostExpensiveTrip: stats.mostExpensiveTrip,
        cheapestTrip: stats.cheapestTrip,
        longestTrip: stats.longestTrip,
        shortestTrip: stats.shortestTrip,
        totalDistance: stats.totalDistance,
        moneySaved: stats.moneySaved,
        averageRating: stats.averageRating,
        travelScore: stats.travelScore,
        travelScoreLabel: stats.travelScoreLabel,
        achievements: stats.achievements,
        charts: stats.charts,
        heatmap: stats.heatmap,
        timeline: stats.timeline,
        insights: stats.insights,
        aiRecommendations: stats.aiRecommendations,
        yearComparison: stats.yearComparison,
        currency: stats.currency || "INR",
        analysisHash: hash,
        recalculatedAt: new Date(),
      },
    },
    { upsert: true, new: true, runValidators: true },
  )

  const milestones = [5, 10, 25, 50]
  for (const m of milestones) {
    if (cityCount >= m && prevCityCount < m) {
      notifyTravelMilestone(userId, {
        title: "Travel milestone unlocked!",
        message: `Congratulations! You visited your ${m}${m === 10 ? "th" : "th"} city.`,
        milestone: `cities-${m}`,
        count: m,
      }).catch(() => {})
    }
  }

  return doc
}

export async function recalculateAnalytics(userId, { force = false } = {}) {
  const stats = await computeUserStatistics(userId)
  const hash = buildAnalysisHash({
    totalTrips: stats.totalTrips,
    totalSpent: stats.totalSpent,
    completed: stats.completedTrips,
    cities: stats.citiesVisited?.length,
  })

  const cacheKey = String(userId)
  const hit = cache.get(cacheKey)
  if (!force && hit && hit.hash === hash && Date.now() - hit.at < CACHE_TTL_MS) {
    const existing = await TravelAnalytics.findOne({ userId }).lean()
    if (existing) return dashboardFromStats(stats, serializeTravelAnalytics(existing))
  }

  const ai = await generateAIInsights(stats)
  stats.insights = ai.insights
  stats.aiRecommendations = ai.aiRecommendations
  stats.demo = ai.demo

  const doc = await persistAnalytics(userId, stats, hash)
  cache.set(cacheKey, { hash, at: Date.now() })

  try {
    const { RedisKeys } = await import("../../utils/cacheHelpers.js")
    const { cacheDel } = await import("../cacheService.js")
    await cacheDel(
      RedisKeys.analyticsDashboard(userId),
      RedisKeys.analyticsScore(userId),
      RedisKeys.analyticsCharts(userId),
      RedisKeys.analyticsExpense(userId),
    )
  } catch {
    /* redis optional */
  }

  return dashboardFromStats(stats, serializeTravelAnalytics(doc))
}

export async function getAnalyticsDashboard(userId) {
  const { withCache, RedisKeys, TTL } = await import("../../utils/cacheHelpers.js")
  return withCache(RedisKeys.analyticsDashboard(userId), TTL.ANALYTICS, async () => {
    const doc = await TravelAnalytics.findOne({ userId }).lean()
    if (!doc) {
      return {
        exists: false,
        totalTrips: 0,
        travelScore: 0,
        charts: {},
        heatmap: [],
        timeline: [],
        achievements: [],
        insights: [],
      }
    }
    return dashboardFromStats(serializeTravelAnalytics(doc), serializeTravelAnalytics(doc))
  })
}

export async function getYearReport(userId, year) {
  const stats = await computeUserStatistics(userId, { year: Number(year) })
  const ai = await generateAIInsights(stats)
  return {
    year: Number(year),
    ...stats,
    insights: ai.insights,
    aiRecommendations: ai.aiRecommendations,
  }
}

export async function getMonthReport(userId, month) {
  const stats = await computeUserStatistics(userId, { month })
  return { month, ...stats }
}

export async function getTravelScore(userId) {
  const { withCache, RedisKeys, TTL } = await import("../../utils/cacheHelpers.js")
  return withCache(RedisKeys.analyticsScore(userId), TTL.ANALYTICS, async () => {
    const doc = await TravelAnalytics.findOne({ userId }).select("travelScore travelScoreLabel recalculatedAt").lean()
    if (!doc) {
      const stats = await computeUserStatistics(userId)
      return {
        score: stats.travelScore,
        label: stats.travelScoreLabel,
        recalculatedAt: null,
      }
    }
    return {
      score: doc.travelScore,
      label: doc.travelScoreLabel,
      recalculatedAt: doc.recalculatedAt,
    }
  })
}

export async function getAnalyticsForExport(userId, { year } = {}) {
  const stats = year
    ? await computeUserStatistics(userId, { year: Number(year) })
    : await computeUserStatistics(userId)
  const doc = await TravelAnalytics.findOne({ userId }).lean()
  return {
    ...stats,
    travelScore: doc?.travelScore ?? stats.travelScore,
    travelScoreLabel: doc?.travelScoreLabel ?? stats.travelScoreLabel,
    achievements: doc?.achievements ?? stats.achievements,
    insights: doc?.insights ?? stats.insights,
  }
}
