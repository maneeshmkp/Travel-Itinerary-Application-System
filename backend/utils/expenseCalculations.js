import { normalizeCost } from "./budgetCalculations.js"
import { EXPENSE_CATEGORY_OPTIONS } from "../constants/expenseCategories.js"

export function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

/** Trip planned budget: itinerary max budget, else sum of activity costs. */
export function resolvePlannedBudget(itinerary, insight) {
  const activityTotal = normalizeCost(insight?.totalBudget)
  const budgetMax =
    itinerary?.budget?.max != null && itinerary.budget.max !== ""
      ? normalizeCost(itinerary.budget.max)
      : null

  if (budgetMax != null && budgetMax > 0) return budgetMax
  return activityTotal
}

export function buildBudgetComparison(planned, actual) {
  const p = normalizeCost(planned)
  const a = normalizeCost(actual)
  const remaining = roundMoney(p - a)
  const percentUsed = p > 0 ? roundMoney((a / p) * 100) : null
  const exceededBy = p > 0 && a > p ? roundMoney(a - p) : 0

  let warningLevel = null
  if (percentUsed != null) {
    if (percentUsed > 100) warningLevel = "over"
    else if (percentUsed >= 100) warningLevel = "exhausted"
    else if (percentUsed >= 90) warningLevel = "almost"
    else if (percentUsed >= 80) warningLevel = "approaching"
  }

  return { remaining, percentUsed, exceededBy, warningLevel, overBudget: a > p && p > 0 }
}

export function categoryRowStatus(planned, actual) {
  const p = normalizeCost(planned)
  const a = normalizeCost(actual)
  if (p <= 0 && a <= 0) return "none"
  if (a <= p) return "under"
  return "over"
}

export function buildDailyTimeline(expenses, totalDays, currency, normalizeCurrency) {
  const days = new Map()
  for (let d = 1; d <= Math.max(1, totalDays); d += 1) {
    days.set(d, { dayNumber: d, expenses: [], total: 0 })
  }

  for (const e of expenses) {
    if (normalizeCurrency(e.currency) !== currency) continue
    const dayNum = Number(e.dayNumber)
    if (!Number.isFinite(dayNum) || dayNum < 1) continue
    if (!days.has(dayNum)) {
      days.set(dayNum, { dayNumber: dayNum, expenses: [], total: 0 })
    }
    const bucket = days.get(dayNum)
    const amt = normalizeCost(e.amount)
    bucket.expenses.push(e)
    bucket.total = roundMoney(bucket.total + amt)
  }

  const timeline = [...days.values()]
    .filter((d) => d.expenses.length > 0)
    .sort((a, b) => a.dayNumber - b.dayNumber)

  const daysWithSpend = timeline.length
  const totalSpent = timeline.reduce((s, d) => s + d.total, 0)
  const averagePerDay = daysWithSpend > 0 ? roundMoney(totalSpent / daysWithSpend) : 0

  return { timeline, averagePerDay, daysWithSpend }
}

export function buildCumulativeByDay(expenses, currency, normalizeCurrency) {
  const byDay = new Map()
  for (const e of expenses) {
    if (normalizeCurrency(e.currency) !== currency) continue
    const dayNum = Number(e.dayNumber)
    if (!Number.isFinite(dayNum) || dayNum < 1) continue
    byDay.set(dayNum, roundMoney((byDay.get(dayNum) || 0) + normalizeCost(e.amount)))
  }
  const sorted = [...byDay.entries()].sort((a, b) => a[0] - b[0])
  let cumulative = 0
  return sorted.map(([day, amount]) => {
    cumulative = roundMoney(cumulative + amount)
    return { day, amount, cumulative }
  })
}

export function buildChartData(byCategory, dailyTimeline, cumulative) {
  const pie = byCategory
    .filter((c) => c.actual > 0)
    .map((c) => ({ name: c.label, value: c.actual, id: c.id }))

  const bar = dailyTimeline.map((d) => ({
    day: `Day ${d.dayNumber}`,
    dayNumber: d.dayNumber,
    amount: d.total,
  }))

  const line = cumulative.map((c) => ({
    day: `Day ${c.day}`,
    dayNumber: c.day,
    cumulative: c.cumulative,
  }))

  return { pie, bar, line }
}

export function generateInsights({ planned, actual, comparison, byCategory, averagePerDay, currency }) {
  const insights = []
  const { percentUsed, remaining, exceededBy } = comparison

  if (planned <= 0) {
    insights.push("Set a trip budget or activity costs on your itinerary to enable planned vs actual tracking.")
    if (actual > 0) {
      insights.push(`You have logged ${actual} ${currency} in expenses so far.`)
    }
    return insights
  }

  if (percentUsed != null) {
    if (exceededBy > 0) {
      insights.push(`You exceeded your budget by ${exceededBy} ${currency}.`)
    } else if (remaining > 0) {
      insights.push(`You still have ${remaining} ${currency} remaining in your trip budget.`)
      insights.push(`You have spent ${Math.round(percentUsed)}% of your trip budget.`)
    }
  }

  if (averagePerDay > 0) {
    insights.push(`Average daily spending is ${averagePerDay} ${currency}.`)
  }

  const topCategory = [...byCategory].sort((a, b) => b.actual - a.actual).find((c) => c.actual > 0)
  if (topCategory && actual > 0) {
    const pct = Math.round((topCategory.actual / actual) * 100)
    insights.push(`You spent ${pct}% of your expenses on ${topCategory.label.toLowerCase()}.`)
  }

  for (const row of byCategory) {
    if (row.planned > 0 && row.actual > row.planned) {
      insights.push(`You exceeded your ${row.label} budget.`)
    } else if (row.planned > 0 && row.actual > 0 && row.actual < row.planned * 0.85) {
      insights.push(`${row.label} spending is lower than planned.`)
    }
  }

  return [...new Set(insights)].slice(0, 6)
}

export function enrichCategoryRows(rows) {
  return rows.map((row) => {
    const status = categoryRowStatus(row.planned, row.actual)
    const difference = roundMoney(row.planned - row.actual)
    const percentOfCategory =
      row.planned > 0 ? roundMoney((row.actual / row.planned) * 100) : row.actual > 0 ? 100 : 0
    return {
      ...row,
      status,
      difference,
      percentOfCategory,
      label: EXPENSE_CATEGORY_OPTIONS.find((c) => c.id === row.id)?.label || row.label,
    }
  })
}
