/** Shared date helpers for weather services (no API calls). */

export function throwClientError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

export function normalizeDateInput(dateInput) {
  if (!dateInput) {
    return new Date().toISOString().slice(0, 10)
  }
  const parsed = new Date(`${dateInput}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    throw throwClientError("Invalid date — use YYYY-MM-DD")
  }
  return parsed.toISOString().slice(0, 10)
}

export function addDays(dateStr, offset) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
