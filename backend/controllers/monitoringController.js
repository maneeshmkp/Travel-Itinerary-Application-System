import { collectHealth, buildAlerts } from "../services/monitoring/healthService.js"
import { getMetricsSnapshot } from "../services/monitoring/metricsStore.js"
import logger from "../logger/index.js"

/** GET /api/health — public comprehensive health (no secrets) */
export const getPublicHealth = async (_req, res, next) => {
  try {
    const health = await collectHealth()
    const httpStatus = health.status === "unhealthy" ? 503 : 200
    res.status(httpStatus).json(health)
  } catch (err) {
    next(err)
  }
}

/** GET /api/health/live — lightweight liveness (no dependency probes) */
export const getLiveness = async (_req, res) => {
  res.status(200).json({
    success: true,
    status: "alive",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}

/** GET /api/monitoring/overview — admin */
export const getMonitoringOverview = async (_req, res, next) => {
  try {
    const health = await collectHealth()
    const metrics = getMetricsSnapshot()
    const alerts = buildAlerts(health)
    logger.debug("Admin monitoring overview requested")
    res.json({
      success: true,
      data: {
        health,
        metrics,
        alerts,
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/monitoring/metrics — admin */
export const getMonitoringMetrics = async (_req, res, next) => {
  try {
    res.json({ success: true, data: getMetricsSnapshot() })
  } catch (err) {
    next(err)
  }
}

/** GET /api/monitoring/alerts — admin */
export const getMonitoringAlerts = async (_req, res, next) => {
  try {
    const health = await collectHealth()
    res.json({ success: true, data: { alerts: buildAlerts(health) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/monitoring/services — admin status cards */
export const getMonitoringServices = async (_req, res, next) => {
  try {
    const health = await collectHealth()
    res.json({
      success: true,
      data: {
        server: health.server,
        services: health.services,
        memory: health.memory,
        cpu: health.cpu,
      },
    })
  } catch (err) {
    next(err)
  }
}
