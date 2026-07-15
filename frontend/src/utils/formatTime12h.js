/**
 * Format 24h "HH:mm" to 12h "h:mm AM/PM".
 */
export function formatTime12h(hhmm) {
  if (!hhmm) return "—"
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return String(hhmm)
  let hours = Number(m[1])
  const minutes = m[2]
  const meridiem = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return minutes === "00" ? `${hours} ${meridiem}` : `${hours}:${minutes} ${meridiem}`
}
