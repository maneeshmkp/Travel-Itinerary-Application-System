import { detectWeatherRisks } from "../weatherRisk.js"
import { detectBudgetRisks } from "../budgetRisk.js"
import { detectDocumentRisks } from "../documentRisk.js"
import { detectScheduleRisks } from "../scheduleOptimizer.js"
import { detectBookingRisks, detectCalendarConflicts } from "./bookingRisk.js"

/**
 * Rule-based risk detection from trip context (no LLM).
 */
export function runRuleBasedDetection(ctx) {
  const weather = detectWeatherRisks(ctx.weatherForecast || [], ctx.destination)
  const budget = detectBudgetRisks(ctx.budgetSummary)
  const documents = detectDocumentRisks(ctx.missingDocuments, ctx.documents)
  const schedule = detectScheduleRisks(ctx.trip)
  const booking = detectBookingRisks(ctx.bookings, ctx.trip)
  const calendar = detectCalendarConflicts(ctx.calendarEvents)

  const risks = [
    ...weather.risks,
    ...budget,
    ...documents,
    ...schedule,
    ...booking,
    ...calendar,
  ]

  return {
    risks,
    weatherSummary: weather.summary,
    factors: {
      budgetExceeded: budget.some((r) => r.riskType === "budget_exceeded" && r.severity !== "LOW"),
      missingDocuments: (ctx.missingDocuments?.missing || []).length > 0,
      weatherAlerts: weather.risks.length > 0,
      scheduleConflicts: schedule.some((r) =>
        ["overlapping_activities", "schedule_conflict"].includes(r.riskType),
      ),
    },
  }
}
