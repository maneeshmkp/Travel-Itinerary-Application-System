/**
 * In-process metrics for queue throughput / latency / retries.
 */
const MAX_SAMPLES = 200

const state = {
  enqueued: 0,
  completed: 0,
  failed: 0,
  retries: 0,
  deadLetter: 0,
  byQueue: Object.create(null),
  latencies: [],
  recentFailures: [],
}

function bucket(name) {
  if (!state.byQueue[name]) {
    state.byQueue[name] = {
      enqueued: 0,
      completed: 0,
      failed: 0,
      retries: 0,
      deadLetter: 0,
      totalMs: 0,
    }
  }
  return state.byQueue[name]
}

export const jobMetrics = {
  recordEnqueued(queue) {
    state.enqueued += 1
    bucket(queue).enqueued += 1
  },
  recordCompleted(queue, ms = 0) {
    state.completed += 1
    const b = bucket(queue)
    b.completed += 1
    b.totalMs += ms
    state.latencies.push({ t: Date.now(), queue, ms })
    if (state.latencies.length > MAX_SAMPLES) state.latencies.shift()
  },
  recordFailed(queue, message) {
    state.failed += 1
    bucket(queue).failed += 1
    state.recentFailures.unshift({
      at: new Date().toISOString(),
      queue,
      message: String(message || "").slice(0, 200),
    })
    if (state.recentFailures.length > 50) state.recentFailures.length = 50
  },
  recordRetry(queue) {
    state.retries += 1
    bucket(queue).retries += 1
  },
  recordDeadLetter(queue) {
    state.deadLetter += 1
    bucket(queue).deadLetter += 1
  },
  getSnapshot() {
    const byQueue = Object.entries(state.byQueue).map(([queue, s]) => ({
      queue,
      ...s,
      avgMs: s.completed ? Math.round(s.totalMs / s.completed) : 0,
    }))
    const recent = state.latencies.slice(-50)
    const avgLatency = recent.length
      ? Math.round(recent.reduce((a, x) => a + x.ms, 0) / recent.length)
      : 0
    return {
      totals: {
        enqueued: state.enqueued,
        completed: state.completed,
        failed: state.failed,
        retries: state.retries,
        deadLetter: state.deadLetter,
      },
      throughput: {
        completed: state.completed,
        failed: state.failed,
        avgExecutionMs: avgLatency,
      },
      byQueue: byQueue.sort((a, b) => b.completed - a.completed),
      recentFailures: state.recentFailures.slice(0, 20),
      recentLatencies: recent.slice().reverse(),
    }
  },
  resetForTests() {
    state.enqueued = 0
    state.completed = 0
    state.failed = 0
    state.retries = 0
    state.deadLetter = 0
    state.byQueue = Object.create(null)
    state.latencies = []
    state.recentFailures = []
  },
}

export default jobMetrics
