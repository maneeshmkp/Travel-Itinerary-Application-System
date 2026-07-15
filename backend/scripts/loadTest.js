/**
 * HTTP load test harness (no external k6 dependency).
 *
 * Simulates concurrent virtual users against public/health and optional API routes.
 *
 * Usage:
 *   node scripts/loadTest.js
 *   node scripts/loadTest.js --base http://localhost:5000 --users 100,500,1000
 *
 * Env:
 *   LOAD_BASE_URL=http://localhost:5000
 *   LOAD_AUTH_TOKEN=<optional JWT for authenticated endpoints>
 */
import http from "http"
import https from "https"
import { URL } from "url"
import os from "os"

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`)
  if (i >= 0 && args[i + 1]) return args[i + 1]
  return fallback
}

const BASE = arg("base", process.env.LOAD_BASE_URL || "http://localhost:5000")
const USER_TIERS = String(arg("users", "100,500,1000"))
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0)
const DURATION_MS = Number(arg("duration", "15000"))
const PATHS = String(arg("paths", "/api/health/live"))
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean)
const AUTH = process.env.LOAD_AUTH_TOKEN || arg("token", "")

function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function requestOnce(path) {
  const url = new URL(path.startsWith("http") ? path : `${BASE.replace(/\/$/, "")}${path}`)
  const lib = url.protocol === "https:" ? https : http
  const started = Date.now()
  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(AUTH ? { Authorization: `Bearer ${AUTH}` } : {}),
        },
        timeout: 30_000,
      },
      (res) => {
        res.resume()
        res.on("end", () => {
          resolve({ ok: res.statusCode < 500, status: res.statusCode, ms: Date.now() - started })
        })
      },
    )
    req.on("error", () => resolve({ ok: false, status: 0, ms: Date.now() - started }))
    req.on("timeout", () => {
      req.destroy()
      resolve({ ok: false, status: 0, ms: Date.now() - started })
    })
    req.end()
  })
}

async function runTier(concurrency) {
  const latencies = []
  let errors = 0
  let completed = 0
  const endAt = Date.now() + DURATION_MS
  const memBefore = process.memoryUsage().rss

  async function worker() {
    while (Date.now() < endAt) {
      const path = PATHS[completed % PATHS.length]
      const result = await requestOnce(path)
      latencies.push(result.ms)
      if (!result.ok) errors += 1
      completed += 1
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  const wallStart = Date.now()
  await Promise.all(workers)
  const wallMs = Date.now() - wallStart
  const memAfter = process.memoryUsage().rss

  const avg = latencies.length
    ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
    : 0

  return {
    concurrency,
    requests: completed,
    errors,
    errorRate: completed ? Math.round((errors / completed) * 1000) / 10 : 0,
    throughputRps: wallMs ? Math.round((completed / (wallMs / 1000)) * 10) / 10 : 0,
    latency: {
      avg,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: latencies.length ? Math.max(...latencies) : 0,
    },
    clientRssDeltaMb: Math.round(((memAfter - memBefore) / 1024 / 1024) * 10) / 10,
    hostLoad1: os.loadavg()[0],
    durationMs: wallMs,
  }
}

async function main() {
  console.log(`Load test → ${BASE}`)
  console.log(`Paths: ${PATHS.join(", ")}`)
  console.log(`Tiers: ${USER_TIERS.join(", ")} VUs · ${DURATION_MS}ms each`)
  console.log(`Host load1 before: ${os.loadavg()[0]} · cores ${os.cpus().length}`)

  // Warmup
  await requestOnce(PATHS[0])

  const results = []
  for (const n of USER_TIERS) {
    console.log(`\nRunning ${n} concurrent users…`)
    const row = await runTier(n)
    results.push(row)
    console.log(
      `  req=${row.requests} err=${row.errors} (${row.errorRate}%) rps=${row.throughputRps} ` +
        `avg=${row.latency.avg}ms p95=${row.latency.p95}ms p99=${row.latency.p99}ms`,
    )
  }

  console.log("\n=== SUMMARY (JSON) ===")
  console.log(JSON.stringify({ base: BASE, paths: PATHS, results }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
