/**
 * Warm AI recommendation caches for sample preference shapes.
 */
export async function processAiRecommendationJob(job) {
  const destinations =
    job.data?.destinations || ["Paris", "Tokyo", "Bali"].slice(0, job.data?.limit || 3)

  let warmed = 0
  try {
    const { getAdvancedRecommendations } = await import("../services/recommendationEngine.js")
    for (const destination of destinations) {
      try {
        await getAdvancedRecommendations({
          preferences: {
            destination,
            tags: job.data?.interests || ["culture", "food"],
            budgetMin: job.data?.budgetMin ?? 500,
            budgetMax: job.data?.budgetMax ?? 3000,
            nights: job.data?.nights ?? 5,
          },
          limit: 6,
        })
        warmed += 1
      } catch {
        /* individual destination failures are non-fatal */
      }
    }
  } catch (err) {
    return { warmed: 0, error: err.message, skipped: true }
  }
  return { warmed, destinations: destinations.length }
}
