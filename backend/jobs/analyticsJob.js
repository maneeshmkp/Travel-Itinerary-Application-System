export async function processAnalyticsJob(job) {
  const { recalculateAnalytics } = await import("../services/travelAnalytics/travelAnalyticsService.js")
  const data = job.data || {}

  if (data.userId) {
    await recalculateAnalytics(data.userId, { force: Boolean(data.force) })
    return { mode: "user", userId: String(data.userId) }
  }

  // Aggregate mode — refresh analytics for recently active users
  if (data.mode === "aggregate") {
    const User = (await import("../models/User.js")).default
    const users = await User.find({ status: { $ne: "suspended" } })
      .sort({ updatedAt: -1 })
      .limit(25)
      .select("_id")
      .lean()
    let ok = 0
    for (const u of users) {
      try {
        await recalculateAnalytics(u._id, { force: false })
        ok += 1
      } catch {
        /* continue */
      }
    }
    return { mode: "aggregate", processed: ok, total: users.length }
  }

  return { skipped: true, reason: "no userId" }
}
