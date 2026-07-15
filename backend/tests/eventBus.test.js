import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import EventBus, {
  on,
  publish,
  clearAllSubscribers,
  resetDedupeForTests,
  listSubscribers,
} from "../events/EventBus.js"
import { eventMetrics } from "../events/metrics.js"
import { DOMAIN_EVENTS } from "../events/catalog.js"

describe("EventBus", () => {
  beforeEach(() => {
    clearAllSubscribers()
    resetDedupeForTests()
    eventMetrics.resetForTests()
  })

  it("emits events to subscribers", async () => {
    const seen = []
    on(DOMAIN_EVENTS.TRIP_CREATED, async (payload, ctx) => {
      seen.push({ payload, eventName: ctx.eventName })
    }, { name: "test-sub" })

    const result = await publish(
      DOMAIN_EVENTS.TRIP_CREATED,
      { tripId: "t1", userId: "u1" },
      { source: "test", userId: "u1" },
    )

    assert.equal(result.handlers, 1)
    assert.equal(result.failures, 0)
    assert.equal(seen.length, 1)
    assert.equal(seen[0].payload.tripId, "t1")
    assert.equal(seen[0].eventName, DOMAIN_EVENTS.TRIP_CREATED)
    assert.equal(eventMetrics.getSnapshot().totals.published, 1)
  })

  it("isolates subscriber failures", async () => {
    const ok = []
    on(DOMAIN_EVENTS.BOOKING_CREATED, async () => {
      throw new Error("boom")
    }, { name: "failing" })
    on(DOMAIN_EVENTS.BOOKING_CREATED, async () => {
      ok.push(1)
    }, { name: "healthy" })

    const result = await publish(DOMAIN_EVENTS.BOOKING_CREATED, { id: "b1" }, { source: "test" })

    assert.equal(result.handlers, 2)
    assert.equal(result.failures, 1)
    assert.deepEqual(ok, [1])
    assert.ok(eventMetrics.getSnapshot().totals.failures >= 1)
    assert.ok(eventMetrics.getSnapshot().failedEvents.length >= 1)
  })

  it("prevents duplicate publishes with the same dedupeKey", async () => {
    let count = 0
    on(DOMAIN_EVENTS.EXPENSE_ADDED, async () => {
      count += 1
    }, { name: "counter" })

    const meta = { source: "test", dedupeKey: "expense:create:abc" }
    const first = await publish(DOMAIN_EVENTS.EXPENSE_ADDED, { id: "abc" }, meta)
    const second = await publish(DOMAIN_EVENTS.EXPENSE_ADDED, { id: "abc" }, meta)

    assert.equal(first.skipped, undefined)
    assert.equal(second.skipped, true)
    assert.equal(count, 1)
    assert.equal(eventMetrics.getSnapshot().totals.duplicates, 1)
  })

  it("lists subscribers by event", () => {
    on(DOMAIN_EVENTS.USER_LOGGED_IN, async () => {}, { name: "A" })
    on(DOMAIN_EVENTS.USER_LOGGED_IN, async () => {}, { name: "B" })
    assert.deepEqual(listSubscribers(DOMAIN_EVENTS.USER_LOGGED_IN), ["A", "B"])
  })

  it("exposes events-per-minute and top types in metrics", async () => {
    on(DOMAIN_EVENTS.DOCUMENT_UPLOADED, async () => {}, { name: "noop" })
    await publish(DOMAIN_EVENTS.DOCUMENT_UPLOADED, {}, { source: "t1" })
    await publish(DOMAIN_EVENTS.DOCUMENT_UPLOADED, {}, { source: "t2" })
    await publish(DOMAIN_EVENTS.WEATHER_UPDATED, {}, { source: "t3" })

    const snap = eventMetrics.getSnapshot()
    assert.ok(snap.eventsPerMinute >= 3)
    assert.ok(snap.topEventTypes[0].eventName === DOMAIN_EVENTS.DOCUMENT_UPLOADED)
    assert.ok(snap.recentEvents.length >= 3)
  })

  it("exports EventBus facade", () => {
    assert.equal(typeof EventBus.publish, "function")
    assert.equal(typeof EventBus.on, "function")
  })
})
