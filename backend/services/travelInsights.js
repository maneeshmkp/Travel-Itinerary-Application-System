import { llmChatJson } from "./aiService.js"

function clip(obj) {
  const s = JSON.stringify(obj)
  return s.length > 18000 ? s.slice(0, 18000) + "…" : s
}

export function generateRuleBasedInsights(stats = {}) {
  const insights = []

  if (stats.favoriteCategory) {
    insights.push(`You prefer ${stats.favoriteCategory} experiences across your trips.`)
  }
  if (stats.averageBudget > 0 && stats.totalSpent > 0) {
    const pct = Math.round((stats.averageActualExpense / stats.averageBudget) * 100)
    insights.push(`On average you spend ${pct}% of your planned budget per trip.`)
  }
  if (stats.moneySaved > 0) {
    insights.push(`You saved ₹${stats.moneySaved} using AI budget recommendations.`)
  }
  if (stats.totalTravelDays > 0) {
    const avg = Math.round(stats.totalTravelDays / Math.max(1, stats.totalTrips))
    insights.push(`You usually travel for about ${avg} days per trip.`)
  }
  if (stats.countriesVisited?.length) {
    insights.push(`You've explored ${stats.countriesVisited.length} countries and ${stats.citiesVisited?.length || 0} cities.`)
  }
  if (stats.averageRating > 0) {
    insights.push(`Your average trip rating is ${stats.averageRating.toFixed(1)} / 5.`)
  }
  if (stats.favoriteDestination) {
    insights.push(`${stats.favoriteDestination} is your most visited destination.`)
  }

  const beach = (stats.charts?.categories || []).find((c) => c.name === "beach")
  if (beach?.value >= 2) {
    insights.push("You prefer beach destinations.")
  }
  const adventure = (stats.charts?.categories || []).find((c) => c.name === "adventure")
  if (adventure?.value >= 2) {
    insights.push("Adventure trips receive your highest engagement.")
  }

  return insights.slice(0, 10)
}

function demoRecommendations(stats) {
  const next =
    stats.favoriteCategory === "beach"
      ? "Andaman Islands or Goa monsoon escape"
      : stats.favoriteCategory === "adventure"
        ? "Manali or Rishikesh"
        : stats.favoriteCountry === "India"
          ? "Jaipur or Kerala backwaters"
          : "Bali or Thailand"

  return {
    demo: true,
    nextDestination: next,
    bestMonth: "October–March",
    estimatedBudget: stats.averageBudget || 25000,
    recommendedDuration: Math.round(stats.totalTravelDays / Math.max(1, stats.totalTrips)) || 5,
    activities: ["local food tour", "heritage walk", "sunset viewpoint"],
    reasoning: ["Based on your travel history and preferred categories."],
  }
}

export async function generateAIInsights(stats = {}) {
  const ruleInsights = generateRuleBasedInsights(stats)

  const system = `You are a personal travel analytics assistant like Spotify Wrapped + Google Travel.
Return ONLY valid JSON:
{
  "insights": ["short personalized insight strings"],
  "recommendations": {
    "nextDestination": "string",
    "bestMonth": "string",
    "estimatedBudget": number,
    "recommendedDuration": number,
    "activities": ["string"],
    "reasoning": ["string"]
  }
}
Never return plain text outside JSON.`

  const user = `Travel statistics:\n${clip({
    totalTrips: stats.totalTrips,
    completedTrips: stats.completedTrips,
    countries: stats.countriesVisited,
    cities: stats.citiesVisited?.slice(0, 20),
    favoriteDestination: stats.favoriteDestination,
    favoriteCategory: stats.favoriteCategory,
    averageBudget: stats.averageBudget,
    totalSpent: stats.totalSpent,
    moneySaved: stats.moneySaved,
    averageRating: stats.averageRating,
    travelScore: stats.travelScore,
    charts: {
      categories: stats.charts?.categories?.slice(0, 8),
      countries: stats.charts?.countries,
    },
  })}`

  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed) {
    return {
      demo: false,
      insights: [...ruleInsights, ...(parsed.insights || [])].slice(0, 12),
      aiRecommendations: parsed.recommendations || demoRecommendations(stats),
    }
  }

  return {
    demo: true,
    insights: ruleInsights,
    aiRecommendations: demoRecommendations(stats),
  }
}
