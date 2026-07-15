import os from "os"
import mongoose from "mongoose"
import { HeadBucketCommand } from "@aws-sdk/client-s3"
import { isS3Configured, getS3ClientForHealth } from "../storage/s3StorageProvider.js"
import { isGoogleGeocodingConfigured } from "../geocodingService.js"
import { getIO } from "../../socket/index.js"
import { getMetricsSnapshot, getSocketMetrics, getRedisCacheMetrics } from "./metricsStore.js"
import {
  getRedis,
  isRedisConfigured,
  getRedisConnectionInfo,
} from "../../config/redis.js"
import logger from "../../logger/index.js"

function statusFrom(ok, configured) {
  if (!configured) return "not_configured"
  return ok ? "healthy" : "unhealthy"
}

function colorFrom(status) {
  if (status === "healthy") return "green"
  if (status === "degraded" || status === "not_configured") return "yellow"
  return "red"
}

function memoryStats() {
  const used = process.memoryUsage()
  const total = os.totalmem()
  const free = os.freemem()
  const rssRatio = used.rss / total
  return {
    rssMb: Math.round(used.rss / 1024 / 1024),
    heapUsedMb: Math.round(used.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(used.heapTotal / 1024 / 1024),
    systemTotalMb: Math.round(total / 1024 / 1024),
    systemFreeMb: Math.round(free / 1024 / 1024),
    rssPercent: Math.round(rssRatio * 1000) / 10,
  }
}

function cpuStats() {
  const load = os.loadavg()
  const cores = os.cpus()?.length || 1
  // load[0] / cores ≈ 1-min utilization proxy on multi-core hosts
  const approxPercent = Math.min(100, Math.round((load[0] / cores) * 1000) / 10)
  return {
    cores,
    load1: Math.round(load[0] * 100) / 100,
    load5: Math.round(load[1] * 100) / 100,
    load15: Math.round(load[2] * 100) / 100,
    approxPercent,
  }
}

async function checkMongo() {
  const configured = Boolean(process.env.MONGO_URI || process.env.MONGODB_URI)
  const state = mongoose.connection.readyState
  // 0=disconnected 1=connected 2=connecting 3=disconnecting
  if (!configured) {
    return {
      name: "MongoDB",
      key: "mongodb",
      configured: false,
      status: "unhealthy",
      color: "red",
      detail: "MONGO_URI not set",
    }
  }
  if (state === 1) {
    return {
      name: "MongoDB",
      key: "mongodb",
      configured: true,
      status: "healthy",
      color: "green",
      detail: "connected",
    }
  }
  if (state === 2) {
    return {
      name: "MongoDB",
      key: "mongodb",
      configured: true,
      status: "degraded",
      color: "yellow",
      detail: "connecting",
    }
  }
  return {
    name: "MongoDB",
    key: "mongodb",
    configured: true,
    status: "unhealthy",
    color: "red",
    detail: `readyState=${state}`,
  }
}

async function checkRedis() {
  const configured = isRedisConfigured()
  if (!configured) {
    return {
      name: "Redis",
      key: "redis",
      configured: false,
      status: "not_configured",
      color: "yellow",
      detail: "REDIS_URL not set (optional — app falls back to Mongo/APIs)",
      cache: getRedisCacheMetrics(),
    }
  }

  try {
    const redis = await getRedis()
    const info = getRedisConnectionInfo()
    if (!redis || redis.status !== "ready") {
      return {
        name: "Redis",
        key: "redis",
        configured: true,
        status: "unhealthy",
        color: "red",
        detail: `unavailable (status=${info.status})`,
        cache: getRedisCacheMetrics(),
      }
    }

    const pong = await redis.ping()
    const raw = await redis.info("memory")
    const clientsRaw = await redis.info("clients")
    const statsRaw = await redis.info("stats")
    const keyspaceRaw = await redis.info("keyspace")

    const usedMemory = /used_memory_human:(\S+)/.exec(raw)?.[1] || null
    const usedMemoryBytes = Number(/used_memory:(\d+)/.exec(raw)?.[1] || 0)
    const connectedClients = Number(/connected_clients:(\d+)/.exec(clientsRaw)?.[1] || 0)
    const evictedKeys = Number(/evicted_keys:(\d+)/.exec(statsRaw)?.[1] || 0)
    const keyspaceHits = Number(/keyspace_hits:(\d+)/.exec(statsRaw)?.[1] || 0)
    const keyspaceMisses = Number(/keyspace_misses:(\d+)/.exec(statsRaw)?.[1] || 0)
    const dbKeys = [...keyspaceRaw.matchAll(/keys=(\d+)/g)].reduce(
      (s, m) => s + Number(m[1] || 0),
      0,
    )
    const serverHitTotal = keyspaceHits + keyspaceMisses
    const serverHitRatio =
      serverHitTotal > 0 ? Math.round((keyspaceHits / serverHitTotal) * 1000) / 10 : 0

    const cache = getRedisCacheMetrics()

    return {
      name: "Redis",
      key: "redis",
      configured: true,
      status: pong === "PONG" ? "healthy" : "degraded",
      color: pong === "PONG" ? "green" : "yellow",
      detail: `connected · ${usedMemory || "n/a"} · ${connectedClients} clients · ${dbKeys} keys`,
      memoryUsage: usedMemory,
      memoryBytes: usedMemoryBytes,
      connectedClients,
      keys: dbKeys,
      evictions: evictedKeys,
      keyspaceHits,
      keyspaceMisses,
      hitRatio: serverHitRatio,
      cacheHits: cache.hits,
      cacheMisses: cache.misses,
      appHitRatio: cache.hitRatio,
      invalidations: cache.invalidations,
      rateLimited: cache.rateLimited,
      ttlPolicyNote: "Application TTLs enforced by RedisKeys helpers",
      cache,
    }
  } catch (err) {
    logger.warn("Redis health check failed", { message: err.message })
    return {
      name: "Redis",
      key: "redis",
      configured: true,
      status: "unhealthy",
      color: "red",
      detail: "ping failed — app using failover",
      cache: getRedisCacheMetrics(),
    }
  }
}

async function checkS3() {
  const configured = isS3Configured()
  if (!configured) {
    return {
      name: "AWS S3",
      key: "s3",
      configured: false,
      status: "not_configured",
      color: "yellow",
      detail: "S3 credentials / bucket not set",
    }
  }

  try {
    const client = getS3ClientForHealth()
    const bucket = process.env.AWS_S3_BUCKET
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    return {
      name: "AWS S3",
      key: "s3",
      configured: true,
      status: "healthy",
      color: "green",
      detail: `bucket reachable`,
    }
  } catch (err) {
    logger.warn("S3 health check failed", { message: err.message })
    return {
      name: "AWS S3",
      key: "s3",
      configured: true,
      status: "unhealthy",
      color: "red",
      detail: "bucket unreachable",
    }
  }
}

async function checkAi() {
  const gemini = Boolean(process.env.GEMINI_API_KEY)
  const openai = Boolean(process.env.OPENAI_API_KEY)
  const configured = gemini || openai
  if (!configured) {
    return {
      name: "AI Provider",
      key: "ai",
      configured: false,
      status: "not_configured",
      color: "yellow",
      detail: "No GEMINI_API_KEY or OPENAI_API_KEY",
    }
  }
  return {
    name: "AI Provider",
    key: "ai",
    configured: true,
    status: "healthy",
    color: "green",
    detail: gemini ? "Gemini configured" : "OpenAI configured",
    providers: { gemini, openai },
  }
}

async function checkWeather() {
  const configured = Boolean(process.env.OPENWEATHER_API_KEY)
  if (!configured) {
    return {
      name: "Weather API",
      key: "weather",
      configured: false,
      status: "not_configured",
      color: "yellow",
      detail: "OPENWEATHER_API_KEY not set",
    }
  }
  return {
    name: "Weather API",
    key: "weather",
    configured: true,
    status: "healthy",
    color: "green",
    detail: "OpenWeather key present",
  }
}

async function checkMaps() {
  const geocode = isGoogleGeocodingConfigured()
  const maps =
    Boolean(process.env.GOOGLE_MAPS_API_KEY) || Boolean(process.env.GOOGLE_GEOCODING_API_KEY)
  const configured = geocode || maps
  if (!configured) {
    return {
      name: "Maps / Geocoding",
      key: "maps",
      configured: false,
      status: "not_configured",
      color: "yellow",
      detail: "Google Maps/Geocoding keys not set",
    }
  }
  return {
    name: "Maps / Geocoding",
    key: "maps",
    configured: true,
    status: "healthy",
    color: "green",
    detail: geocode ? "Geocoding configured" : "Maps key present",
  }
}

function checkSocket() {
  const io = getIO()
  const sockets = getSocketMetrics()
  const configured = true
  const ok = Boolean(io)
  return {
    name: "Socket.IO",
    key: "socket",
    configured,
    status: statusFrom(ok, configured),
    color: colorFrom(statusFrom(ok, configured)),
    detail: ok ? `engine up · ${sockets.current} connections` : "not initialized",
    connections: sockets.current,
  }
}

/**
 * Full health payload for /api/health and admin monitoring.
 * Never includes secrets.
 * Short in-process TTL avoids stampede when many probes hit concurrently
 * (load balancers, k8s, monitoring dashboards).
 */
let healthCache = { at: 0, payload: null }
const HEALTH_CACHE_MS = Number(process.env.HEALTH_CACHE_MS || 5000)

export async function collectHealth({ bypassCache = false } = {}) {
  const now = Date.now()
  if (!bypassCache && healthCache.payload && now - healthCache.at < HEALTH_CACHE_MS) {
    return {
      ...healthCache.payload,
      timestamp: new Date().toISOString(),
      cached: true,
    }
  }

  const [mongodb, redis, s3, ai, weather, maps] = await Promise.all([
    checkMongo(),
    checkRedis(),
    checkS3(),
    checkAi(),
    checkWeather(),
    checkMaps(),
  ])
  const socket = checkSocket()
  const memory = memoryStats()
  const cpu = cpuStats()
  const metrics = getMetricsSnapshot()

  const services = { mongodb, redis, s3, ai, weather, maps, socket }
  const criticalUnhealthy = [mongodb, socket].filter((s) => s.status === "unhealthy").length
  const anyUnhealthy = Object.values(services).filter((s) => s.status === "unhealthy").length

  let overall = "healthy"
  let color = "green"
  if (criticalUnhealthy > 0 || anyUnhealthy > 0) {
    overall = criticalUnhealthy > 0 ? "unhealthy" : "degraded"
    color = criticalUnhealthy > 0 ? "red" : "yellow"
  } else if (Object.values(services).some((s) => s.status === "not_configured")) {
    overall = "degraded"
    color = "yellow"
  }

  const payload = {
    success: true,
    status: overall,
    color,
    timestamp: new Date().toISOString(),
    cached: false,
    server: {
      status: "healthy",
      color: "green",
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",
      pid: process.pid,
      platform: process.platform,
    },
    memory,
    cpu,
    services,
    metrics: {
      requestCount: metrics.totalRequests,
      averageResponseTimeMs: metrics.averageLatencyMs,
      errorRate: metrics.errorRate,
      activeUsers: metrics.activeUsersApproximate,
      socketConnections: metrics.socketConnections,
      redisCache: metrics.redisCache || getRedisCacheMetrics(),
    },
  }
  healthCache = { at: now, payload }
  return payload
}

export function buildAlerts(health) {
  const alerts = []
  const mem = health.memory?.rssPercent ?? 0
  const cpuPct = health.cpu?.approxPercent ?? 0

  if (mem > 80) {
    alerts.push({
      level: "critical",
      code: "MEMORY_HIGH",
      message: `Memory usage ${mem}% (> 80%)`,
    })
  }
  if (cpuPct > 80) {
    alerts.push({
      level: "critical",
      code: "CPU_HIGH",
      message: `CPU load approx ${cpuPct}% (> 80%)`,
    })
  }

  const map = health.services || {}
  const check = (key, label) => {
    const s = map[key]
    if (!s) return
    if (s.status === "unhealthy") {
      alerts.push({
        level: "critical",
        code: `${key.toUpperCase()}_DOWN`,
        message: `${label} unavailable`,
      })
    }
  }

  check("mongodb", "MongoDB")
  check("redis", "Redis")
  check("s3", "AWS S3")
  check("ai", "AI API")
  check("weather", "Weather API")
  check("maps", "Maps API")
  check("socket", "Socket.IO")

  return alerts
}
