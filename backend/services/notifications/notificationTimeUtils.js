/**
 * Parse activity/transfer time strings like "9:00 AM", "14:30", "9am".
 * @returns {{ hours: number, minutes: number } | null}
 */
export function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null
  const s = timeStr.trim().toLowerCase()
  const match12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (match12) {
    let h = Number(match12[1])
    const m = Number(match12[2] || 0)
    const ap = match12[3].toLowerCase()
    if (ap === "pm" && h < 12) h += 12
    if (ap === "am" && h === 12) h = 0
    return { hours: h, minutes: m }
  }
  const match24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return { hours: Number(match24[1]), minutes: Number(match24[2]) }
  }
  return null
}

export function addDaysToDate(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}

export function combineDateAndTime(dateOnly, time) {
  const parsed = parseTimeString(time)
  if (!parsed) return null
  const d = new Date(dateOnly)
  d.setHours(parsed.hours, parsed.minutes, 0, 0)
  return d
}

export function minutesBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 60000)
}

export function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isTomorrow(reference, target) {
  const t = new Date(reference)
  t.setDate(t.getDate() + 1)
  return isSameCalendarDay(t, target)
}

export function tripStartDate(itinerary) {
  if (itinerary.startDate) return new Date(itinerary.startDate)
  if (itinerary.createdAt) {
    const d = new Date(itinerary.createdAt)
    d.setHours(0, 0, 0, 0)
    return d
  }
  return null
}

export function dayDateForTrip(itinerary, dayNumber) {
  const start = tripStartDate(itinerary)
  if (!start || !dayNumber) return null
  return addDaysToDate(start, dayNumber - 1)
}
