import { describe, it } from "node:test"
import assert from "node:assert/strict"
import AppError, { ErrorCodes } from "../utils/AppError.js"
import { userRoom } from "../socket/index.js"
import {
  recordRequest,
  getMetricsSnapshot,
  resetMetricsForTests,
} from "../services/monitoring/metricsStore.js"

describe("AppError", () => {
  it("sets operational metadata", () => {
    const err = new AppError("bad input", 400, ErrorCodes.VALIDATION_ERROR)
    assert.equal(err.statusCode, 400)
    assert.equal(err.code, ErrorCodes.VALIDATION_ERROR)
    assert.equal(err.isOperational, true)
  })
})

describe("socket room helper", () => {
  it("builds user room ids", () => {
    assert.equal(userRoom("abc"), "user:abc")
  })
})

describe("metricsStore", () => {
  it("records requests and exposes snapshot fields", () => {
    resetMetricsForTests()
    recordRequest({ method: "GET", url: "/api/health", status: 200, ms: 12 })
    const snap = getMetricsSnapshot()
    assert.ok(snap.totalRequests >= 1)
    assert.ok(Array.isArray(snap.requestsPerMinuteSeries))
    assert.ok("errorRate" in snap)
  })
})
