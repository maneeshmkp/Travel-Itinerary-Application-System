export async function processWeatherRefreshJob(job) {
  const { invalidateWeatherCaches } = await import("../utils/cacheHelpers.js")
  await invalidateWeatherCaches()
  if (job.data?.destination) {
    const { getWeatherForecast } = await import("../services/weatherService.js")
    await getWeatherForecast(job.data.destination, job.data.days || 5)
  }
  return { invalidated: true, warmed: Boolean(job.data?.destination) }
}
