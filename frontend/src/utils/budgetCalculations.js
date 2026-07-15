import { DEFAULT_CURRENCY, normalizeCurrency } from "../constants/currencies.js"

/**
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeCost(value) {
  if (value === null || value === undefined || value === "") return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

/**
 * @param {{ days?: Array<{ dayNumber?: number, dayLabel?: string, activities?: Array<{ name?: string, cost?: unknown }> }>, totalDays?: number, budget?: { currency?: string } }} formData
 */
export function computeFormBudgetInsight(formData) {
  const days = Array.isArray(formData?.days) ? formData.days : []
  const totalDays = Math.max(1, Number(formData?.totalDays) || days.length || 1)
  const currency = normalizeCurrency(formData?.budget?.currency, DEFAULT_CURRENCY)

  let totalBudget = 0
  const byDay = days.map((day) => {
    const activities = Array.isArray(day.activities) ? day.activities : []
    let dayTotal = 0
    const activityBreakdown = activities.map((act) => {
      const cost = normalizeCost(act?.cost)
      dayTotal += cost
      return {
        name: act.name,
        cost,
      }
    })
    totalBudget += dayTotal
    return {
      dayNumber: day.dayNumber,
      dayLabel: day.dayLabel || "",
      dayTotal: Math.round(dayTotal * 100) / 100,
      activities: activityBreakdown,
    }
  })

  totalBudget = Math.round(totalBudget * 100) / 100
  const costPerDay = totalDays > 0 ? Math.round((totalBudget / totalDays) * 100) / 100 : 0

  return {
    totalBudget,
    costPerDay,
    currency,
    totalDays,
    byDay,
  }
}

export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const code = normalizeCurrency(currency, DEFAULT_CURRENCY)
  const n = normalizeCost(amount)
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(n)
  } catch {
    return `${code} ${n.toFixed(2)}`
  }
}

export { DEFAULT_CURRENCY, normalizeCurrency }
