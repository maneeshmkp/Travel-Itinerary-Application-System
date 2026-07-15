/**
 * Periodic budget threshold checks — reuses notification scheduler job body.
 */
export async function processBudgetRecalcJob(job) {
  if (job.data?.userId && job.data?.tripId) {
    try {
      const { analyzeTripBudget } = await import("../services/budgetOptimizer/budgetOptimizerService.js")
      await analyzeTripBudget(job.data.userId, job.data.tripId, job.data || {})
      return { mode: "trip", tripId: String(job.data.tripId) }
    } catch (err) {
      return { mode: "trip", error: err.message }
    }
  }

  try {
    const { runBudgetChecks } = await import("../services/notifications/notificationSchedulerJobs.js")
    const result = await runBudgetChecks()
    return { mode: "scheduled", result }
  } catch (err) {
    throw err
  }
}
