/** Shared with tests — keeps resolve logic testable without importing axios module side effects. */
export function resolveApiBaseUrlForTest(raw) {
  if (!raw) return "/api"
  const noTrail = String(raw).trim().replace(/\/+$/, "")
  if (noTrail.endsWith("/api")) return noTrail
  return `${noTrail}/api`
}
