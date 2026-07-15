import {
  buildExpenseReport,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
  duplicateTripExpense,
  EXPENSE_CATEGORIES,
} from "../services/expenseService.js"
import { notifyBudgetThresholdIfChanged } from "../services/notifications/notificationTriggers.js"
import { buildExpenseCsv, buildExpensePdfBuffer } from "../services/expenseExportService.js"
import { CURRENCY_OPTIONS } from "../constants/currencies.js"
import { PAYMENT_METHOD_OPTIONS } from "../constants/paymentMethods.js"

function handleError(res, err) {
  if (err?.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  return res.status(500).json({ success: false, message: err.message })
}

/** GET /api/itineraries/:id/expenses */
export const getItineraryExpenses = async (req, res) => {
  try {
    const report = await buildExpenseReport(req.user._id, req.params.id)
    if (!report) {
      return res.status(404).json({ success: false, message: "Itinerary not found" })
    }
    res.json({
      success: true,
      categories: EXPENSE_CATEGORIES,
      currencies: CURRENCY_OPTIONS,
      paymentMethods: PAYMENT_METHOD_OPTIONS,
      data: report,
    })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/itineraries/:id/expenses */
export const addItineraryExpense = async (req, res) => {
  try {
    const oldReport = await buildExpenseReport(req.user._id, req.params.id)
    const previousLevel = oldReport?.budget?.warningLevel ?? null

    const expense = await createTripExpense(req.user._id, req.params.id, req.body)
    const report = await buildExpenseReport(req.user._id, req.params.id)

    notifyBudgetThresholdIfChanged(
      req.user._id,
      req.params.id,
      previousLevel,
      report?.budget?.warningLevel,
    ).catch((err) => console.error("Budget notification:", err.message))

    {
      const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
      publishAsync(
        DOMAIN_EVENTS.EXPENSE_ADDED,
        {
          userId: String(req.user._id),
          tripId: String(req.params.id),
          itineraryId: String(req.params.id),
          id: expense?._id ? String(expense._id) : undefined,
          tenantId: req.tenantId || null,
        },
        {
          source: "expenseController.add",
          userId: String(req.user._id),
          dedupeKey: expense?._id ? `expense:add:${expense._id}` : undefined,
        },
      )
    }

    if (report?.budget?.warningLevel === "over") {
      const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
      publishAsync(
        DOMAIN_EVENTS.BUDGET_EXCEEDED,
        {
          userId: String(req.user._id),
          tripId: String(req.params.id),
          itineraryId: String(req.params.id),
          email: req.user.email,
          message: "Trip spending exceeded the planned budget.",
          skipEventNotification: true,
        },
        {
          source: "expenseController.add",
          userId: String(req.user._id),
          dedupeKey: `budget:over:${req.params.id}:${report?.budget?.spent}`,
        },
      )
    }

    res.status(201).json({ success: true, data: { expense, report } })
  } catch (err) {
    handleError(res, err)
  }
}

/** PUT /api/itineraries/:id/expenses/:expenseId */
export const updateItineraryExpense = async (req, res) => {
  try {
    const oldReport = await buildExpenseReport(req.user._id, req.params.id)
    const previousLevel = oldReport?.budget?.warningLevel ?? null

    const expense = await updateTripExpense(req.user._id, req.params.id, req.params.expenseId, req.body)
    const report = await buildExpenseReport(req.user._id, req.params.id)

    notifyBudgetThresholdIfChanged(
      req.user._id,
      req.params.id,
      previousLevel,
      report?.budget?.warningLevel,
    ).catch((err) => console.error("Budget notification:", err.message))

    if (report?.budget?.warningLevel === "over") {
      const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
      publishAsync(
        DOMAIN_EVENTS.BUDGET_EXCEEDED,
        {
          userId: String(req.user._id),
          tripId: String(req.params.id),
          itineraryId: String(req.params.id),
          email: req.user.email,
          message: "Trip spending exceeded the planned budget.",
          skipEventNotification: true,
        },
        {
          source: "expenseController.update",
          userId: String(req.user._id),
          dedupeKey: `budget:over:${req.params.id}:${report?.budget?.spent}`,
        },
      )
    }

    res.json({ success: true, data: { expense, report } })
  } catch (err) {
    handleError(res, err)
  }
}

/** POST /api/itineraries/:id/expenses/:expenseId/duplicate */
export const duplicateItineraryExpense = async (req, res) => {
  try {
    const expense = await duplicateTripExpense(req.user._id, req.params.id, req.params.expenseId)
    const report = await buildExpenseReport(req.user._id, req.params.id)
    res.status(201).json({ success: true, data: { expense, report } })
  } catch (err) {
    handleError(res, err)
  }
}

/** DELETE /api/itineraries/:id/expenses/:expenseId */
export const removeItineraryExpense = async (req, res) => {
  try {
    await deleteTripExpense(req.user._id, req.params.id, req.params.expenseId)
    const report = await buildExpenseReport(req.user._id, req.params.id)
    {
      const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
      publishAsync(
        DOMAIN_EVENTS.EXPENSE_DELETED,
        {
          userId: String(req.user._id),
          tripId: String(req.params.id),
          expenseId: String(req.params.expenseId),
          tenantId: req.tenantId || null,
        },
        {
          source: "expenseController.remove",
          userId: String(req.user._id),
          dedupeKey: `expense:del:${req.params.expenseId}`,
        },
      )
    }
    res.json({ success: true, data: report })
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/itineraries/:id/expenses/export/csv */
export const exportItineraryExpensesCsv = async (req, res) => {
  try {
    const report = await buildExpenseReport(req.user._id, req.params.id)
    if (!report) return res.status(404).json({ success: false, message: "Itinerary not found" })
    const csv = buildExpenseCsv(report)
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="expenses-${req.params.id}.csv"`)
    res.send(csv)
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /api/itineraries/:id/expenses/export/pdf */
export const exportItineraryExpensesPdf = async (req, res) => {
  try {
    const report = await buildExpenseReport(req.user._id, req.params.id)
    if (!report) return res.status(404).json({ success: false, message: "Itinerary not found" })
    const buffer = await buildExpensePdfBuffer(report)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="expenses-${req.params.id}.pdf"`)
    res.send(buffer)
  } catch (err) {
    handleError(res, err)
  }
}
