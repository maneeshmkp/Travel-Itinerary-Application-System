/** Unique test data helpers for E2E. */
export function uniqueEmail(prefix = "e2e") {
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  // Use example.com — User model rejects unknown TLDs like .test
  return `${prefix}.${stamp}.${rand}@example.com`
}

export function uniqueTripTitle(prefix = "E2E Trip") {
  return `${prefix} ${Date.now().toString(36)}`
}

export const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || "TestPass123!"

export function apiBase() {
  return (process.env.E2E_API_URL || "http://localhost:5000/api").replace(/\/$/, "")
}
