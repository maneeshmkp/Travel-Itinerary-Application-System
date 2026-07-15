import Itinerary from "../models/Itinerary.js"
import TripExpense from "../models/TripExpense.js"
import { computeBudgetInsight, normalizeCost } from "../utils/budgetCalculations.js"
import { CURRENCY_OPTIONS, normalizeCurrency, DEFAULT_CURRENCY } from "../constants/currencies.js"
import { PAYMENT_METHOD_OPTIONS, normalizePaymentMethod } from "../constants/paymentMethods.js"
import {
  EXPENSE_CATEGORY_OPTIONS,
  normalizeExpenseCategory,
} from "../constants/expenseCategories.js"
import {
  roundMoney,
  resolvePlannedBudget,
  buildBudgetComparison,
  buildDailyTimeline,
  buildCumulativeByDay,
  buildChartData,
  generateInsights,
  enrichCategoryRows,
} from "../utils/expenseCalculations.js"

export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_OPTIONS

const ACTIVITY_TO_EXPENSE = {
  dining: "food",
  shopping: "shopping",
  sightseeing: "activity",
  adventure: "activity",
  cultural: "activity",
  relaxation: "activity",
}

function emptyCategoryMap() {
  return Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, 0]))
}

function computePlannedByCategory(itinerary) {
  const map = emptyCategoryMap()
  const days = Array.isArray(itinerary?.days) ? itinerary.days : []
  for (const day of days) {
    const activities = Array.isArray(day.activities) ? day.activities : []
    for (const act of activities) {
      if (act?.skipped) continue
      const cost = normalizeCost(act?.cost)
      if (cost <= 0) continue
      const bucket = ACTIVITY_TO_EXPENSE[act.category] || "activity"
      map[bucket] = roundMoney(map[bucket] + cost)
    }
  }
  return map
}

function sumExpensesInCurrency(expenses, currency) {
  return roundMoney(
    expenses
      .filter((e) => normalizeCurrency(e.currency, currency) === currency)
      .reduce((s, e) => s + normalizeCost(e.amount), 0),
  )
}

function computeActualByCategory(expenses, currency) {
  const map = emptyCategoryMap()
  for (const e of expenses) {
    if (normalizeCurrency(e.currency, currency) !== currency) continue
    const cat = normalizeExpenseCategory(e.category)
    map[cat] = roundMoney(map[cat] + normalizeCost(e.amount))
  }
  return map
}

function serializeExpense(e) {
  return {
    id: String(e._id),
    amount: normalizeCost(e.amount),
    category: e.category,
    description: e.description,
    notes: e.notes || "",
    currency: normalizeCurrency(e.currency),
    dayNumber: e.dayNumber,
    paymentMethod: e.paymentMethod || "cash",
    receiptUrl: e.receiptUrl || "",
    spentAt: e.spentAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

async function loadItineraryContext(itineraryId) {
  return Itinerary.findById(itineraryId).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })
}

function validateDayNumber(dayNumber, totalDays) {
  const day = Number(dayNumber)
  if (!Number.isFinite(day) || day < 1) {
    const err = new Error("Valid trip day is required")
    err.statusCode = 400
    throw err
  }
  const max = Math.max(1, Number(totalDays) || 1)
  if (day > max) {
    const err = new Error(`Trip day must be between 1 and ${max}`)
    err.statusCode = 400
    throw err
  }
  return day
}

function parseExpenseBody(body, itinerary, totalDays) {
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error("Amount must be greater than zero")
    err.statusCode = 400
    throw err
  }

  const category = normalizeExpenseCategory(body.category)
  if (!category) {
    const err = new Error("Category is required")
    err.statusCode = 400
    throw err
  }

  const currency = normalizeCurrency(body.currency || itinerary.budget?.currency, DEFAULT_CURRENCY)
  const dayNumber = validateDayNumber(body.dayNumber, totalDays)
  const paymentMethod = normalizePaymentMethod(body.paymentMethod)
  const description =
    String(body.description || body.notes || "").trim() ||
    EXPENSE_CATEGORIES.find((c) => c.id === category)?.label ||
    "Expense"
  const notes = String(body.notes || "").trim()
  const receiptUrl = String(body.receiptUrl || "").trim().slice(0, 500_000)
  const spentAt = body.spentAt ? new Date(body.spentAt) : new Date()

  if (Number.isNaN(spentAt.getTime())) {
    const err = new Error("Invalid expense date")
    err.statusCode = 400
    throw err
  }

  return {
    amount: roundMoney(amount),
    currency,
    category,
    dayNumber,
    paymentMethod,
    description,
    notes,
    receiptUrl,
    spentAt,
  }
}

export async function buildExpenseReport(userId, itineraryId) {
  const itinerary = await loadItineraryContext(itineraryId)
  if (!itinerary) return null

  const insight = computeBudgetInsight(itinerary)
  const currency = normalizeCurrency(itinerary.budget?.currency || insight.currency, DEFAULT_CURRENCY)
  const totalDays = Math.max(1, Number(itinerary.totalDays) || itinerary.days?.length || 1)

  const rawExpenses = await TripExpense.find({ userId, itineraryId }).sort({ spentAt: -1 }).lean()
  const expenses = rawExpenses.map(serializeExpense)

  const plannedByCategory = computePlannedByCategory(itinerary)
  const actualByCategory = computeActualByCategory(rawExpenses, currency)
  const activityPlanned = normalizeCost(insight.totalBudget)
  const plannedBudget = resolvePlannedBudget(itinerary, insight)
  const actualTotal = sumExpensesInCurrency(rawExpenses, currency)

  const comparison = buildBudgetComparison(plannedBudget, actualTotal)

  const byCategory = enrichCategoryRows(
    EXPENSE_CATEGORIES.map(({ id, label, icon }) => ({
      id,
      label,
      icon,
      planned: plannedByCategory[id] || 0,
      actual: actualByCategory[id] || 0,
      variance: roundMoney((actualByCategory[id] || 0) - (plannedByCategory[id] || 0)),
    })),
  )

  const { timeline, averagePerDay, daysWithSpend } = buildDailyTimeline(
    expenses,
    totalDays,
    currency,
    (c) => normalizeCurrency(c, currency),
  )

  const cumulative = buildCumulativeByDay(rawExpenses, currency, (c) => normalizeCurrency(c, currency))
  const charts = buildChartData(byCategory, timeline, cumulative)
  const insights = generateInsights({
    planned: plannedBudget,
    actual: actualTotal,
    comparison,
    byCategory,
    averagePerDay,
    currency,
  })

  const actualByCurrency = {}
  for (const e of rawExpenses) {
    const c = normalizeCurrency(e.currency, currency)
    actualByCurrency[c] = roundMoney((actualByCurrency[c] || 0) + normalizeCost(e.amount))
  }

  return {
    trip: {
      id: String(itinerary._id),
      title: itinerary.title,
      destination: itinerary.destination,
      totalDays,
    },
    currency,
    currencies: CURRENCY_OPTIONS,
    categories: EXPENSE_CATEGORIES,
    paymentMethods: PAYMENT_METHOD_OPTIONS,
    budget: {
      planned: plannedBudget,
      activityPlanned,
      actual: actualTotal,
      remaining: comparison.remaining,
      percentUsed: comparison.percentUsed,
      exceededBy: comparison.exceededBy,
      warningLevel: comparison.warningLevel,
      overBudget: comparison.overBudget,
      budgetMin: itinerary.budget?.min != null ? normalizeCost(itinerary.budget.min) : null,
      budgetMax: itinerary.budget?.max != null ? normalizeCost(itinerary.budget.max) : null,
    },
    byCategory,
    daily: {
      timeline,
      averagePerDay,
      daysWithSpend,
    },
    charts,
    insights,
    expenses,
    actualByCurrency,
    otherCurrencyTotals: Object.entries(actualByCurrency)
      .filter(([code]) => code !== currency && actualByCurrency[code] > 0)
      .map(([code, total]) => ({ currency: code, total })),
  }
}

export async function loadExpenseSummary(userId, itineraryId) {
  const { withCache, RedisKeys, TTL } = await import("../utils/cacheHelpers.js")
  return withCache(
    RedisKeys.expenseSummary(userId, itineraryId),
    TTL.EXPENSE,
    async () => {
      const report = await buildExpenseReport(userId, itineraryId)
      if (!report) return null
      return {
        totalSpent: report.budget.actual,
        currency: report.currency,
        count: report.expenses.length,
        plannedTotal: report.budget.planned,
        remaining: report.budget.remaining,
        items: report.expenses.slice(0, 20),
      }
    },
  )
}

export async function createTripExpense(userId, itineraryId, body = {}) {
  const itinerary = await loadItineraryContext(itineraryId)
  if (!itinerary) {
    const err = new Error("Itinerary not found")
    err.statusCode = 404
    throw err
  }

  const totalDays = Math.max(1, Number(itinerary.totalDays) || itinerary.days?.length || 1)
  const payload = parseExpenseBody(body, itinerary, totalDays)
  const clientRequestId = body.clientRequestId || body.clientId || null

  if (clientRequestId) {
    const existing = await TripExpense.findOne({ userId, itineraryId, clientRequestId }).lean()
    if (existing) return serializeExpense(existing)
  }

  const expense = await TripExpense.create({
    userId,
    itineraryId,
    ...payload,
    ...(clientRequestId ? { clientRequestId } : {}),
  })

  try {
    const { logExpense } = await import("../logger/index.js")
    const { recordDomainEvent } = await import("./monitoring/metricsStore.js")
    logExpense.info("Expense created", {
      expenseId: String(expense._id),
      amount: expense.amount,
    })
    recordDomainEvent("expense", true)
  } catch {
    /* monitoring optional */
  }

  try {
    const { invalidateExpenseCaches } = await import("../utils/cacheHelpers.js")
    await invalidateExpenseCaches(userId, itineraryId)
  } catch {
    /* redis optional */
  }

  const serialized = serializeExpense(expense.toObject())
  const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
  publishAsync(
    DOMAIN_EVENTS.EXPENSE_ADDED,
    {
      userId: String(userId),
      tripId: String(itineraryId),
      itineraryId: String(itineraryId),
      id: String(expense._id),
      amount: expense.amount,
      skipEventNotification: true,
    },
    { source: "expenseService.create", userId: String(userId), dedupeKey: `expense:create:${expense._id}` },
  )
  return serialized
}

export async function updateTripExpense(userId, itineraryId, expenseId, body = {}) {
  const itinerary = await loadItineraryContext(itineraryId)
  if (!itinerary) {
    const err = new Error("Itinerary not found")
    err.statusCode = 404
    throw err
  }

  const existing = await TripExpense.findOne({ _id: expenseId, userId, itineraryId })
  if (!existing) {
    const err = new Error("Expense not found")
    err.statusCode = 404
    throw err
  }

  const totalDays = Math.max(1, Number(itinerary.totalDays) || itinerary.days?.length || 1)
  const payload = parseExpenseBody({ ...existing.toObject(), ...body }, itinerary, totalDays)

  Object.assign(existing, payload)
  await existing.save()
  try {
    const { invalidateExpenseCaches } = await import("../utils/cacheHelpers.js")
    await invalidateExpenseCaches(userId, itineraryId)
  } catch {
    /* redis optional */
  }
  const serialized = serializeExpense(existing.toObject())
  const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
  publishAsync(
    DOMAIN_EVENTS.EXPENSE_UPDATED,
    {
      userId: String(userId),
      tripId: String(itineraryId),
      itineraryId: String(itineraryId),
      id: String(existing._id),
      amount: existing.amount,
      skipEventNotification: true,
    },
    { source: "expenseService.update", userId: String(userId) },
  )
  return serialized
}

export async function deleteTripExpense(userId, itineraryId, expenseId) {
  const result = await TripExpense.deleteOne({ _id: expenseId, userId, itineraryId })
  if (result.deletedCount === 0) {
    const err = new Error("Expense not found")
    err.statusCode = 404
    throw err
  }
  try {
    const { invalidateExpenseCaches } = await import("../utils/cacheHelpers.js")
    await invalidateExpenseCaches(userId, itineraryId)
  } catch {
    /* redis optional */
  }
  const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
  publishAsync(
    DOMAIN_EVENTS.EXPENSE_DELETED,
    {
      userId: String(userId),
      tripId: String(itineraryId),
      itineraryId: String(itineraryId),
      id: String(expenseId),
    },
    { source: "expenseService.delete", userId: String(userId), dedupeKey: `expense:delete:${expenseId}` },
  )
}

export async function duplicateTripExpense(userId, itineraryId, expenseId) {
  const existing = await TripExpense.findOne({ _id: expenseId, userId, itineraryId }).lean()
  if (!existing) {
    const err = new Error("Expense not found")
    err.statusCode = 404
    throw err
  }

  const { _id, createdAt, updatedAt, ...rest } = existing
  const copy = await TripExpense.create({
    ...rest,
    description: `${rest.description} (copy)`,
    spentAt: new Date(),
  })
  return serializeExpense(copy.toObject())
}
