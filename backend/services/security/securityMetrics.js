/**
 * In-memory security metrics for the Security Dashboard.
 */
const WINDOW_MS = 60 * 60 * 1000
const MAX = 5_000

const state = {
  failedLogins: [],
  blockedRequests: [],
  suspicious: [],
  permissionDenied: [],
}

function prune(arr) {
  const cutoff = Date.now() - WINDOW_MS
  while (arr.length && arr[0].t < cutoff) arr.shift()
  if (arr.length > MAX) arr.splice(0, arr.length - MAX)
}

export function recordSecurityEvent(type, meta = {}) {
  const row = { t: Date.now(), type, ...meta }
  if (type === "failed_login" || type === "login_failed") {
    state.failedLogins.push(row)
    prune(state.failedLogins)
  } else if (type === "rate_limited" || type === "blocked") {
    state.blockedRequests.push(row)
    prune(state.blockedRequests)
  } else if (
    type === "refresh_reuse" ||
    type === "invalid_refresh" ||
    type === "invalid_jwt" ||
    type === "suspicious"
  ) {
    state.suspicious.push(row)
    prune(state.suspicious)
  } else if (type === "permission_denied") {
    state.permissionDenied.push(row)
    prune(state.permissionDenied)
  } else {
    state.suspicious.push(row)
    prune(state.suspicious)
  }
}

export function getSecurityMetricsSnapshot() {
  prune(state.failedLogins)
  prune(state.blockedRequests)
  prune(state.suspicious)
  prune(state.permissionDenied)
  return {
    windowMinutes: 60,
    counts: {
      failedLogins: state.failedLogins.length,
      blockedRequests: state.blockedRequests.length,
      suspicious: state.suspicious.length,
      permissionDenied: state.permissionDenied.length,
    },
    recent: {
      failedLogins: state.failedLogins.slice(-25).reverse(),
      blockedRequests: state.blockedRequests.slice(-25).reverse(),
      suspicious: state.suspicious.slice(-25).reverse(),
      permissionDenied: state.permissionDenied.slice(-25).reverse(),
    },
  }
}

export default { recordSecurityEvent, getSecurityMetricsSnapshot }
