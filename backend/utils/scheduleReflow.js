import { parseActivityTime, formatTime12h } from "../services/activityWeatherService.js"

const DEFAULT_TRAVEL_BUFFER_MIN = 30
const DEFAULT_DURATION_MIN = 120

/**
 * Parse activity duration strings like "2 hours", "2-3 hours", "90 min".
 * @param {string} durationStr
 * @returns {number}
 */
export function parseDurationMinutes(durationStr) {
  const s = String(durationStr || "").toLowerCase().trim()
  if (!s) return DEFAULT_DURATION_MIN

  const rangeMatch = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*h/)
  if (rangeMatch) {
    const low = Number(rangeMatch[1])
    const high = Number(rangeMatch[2])
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return Math.round(((low + high) / 2) * 60)
    }
  }

  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*h/)
  if (hourMatch) {
    const hours = Number(hourMatch[1])
    if (Number.isFinite(hours)) return Math.round(hours * 60)
  }

  const minMatch = s.match(/(\d+)\s*m(?:in(?:ute)?s?)?/)
  if (minMatch) {
    const mins = Number(minMatch[1])
    if (Number.isFinite(mins)) return mins
  }

  return DEFAULT_DURATION_MIN
}

/**
 * @param {string} timeStr
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  const { hours, minutes } = parseActivityTime(timeStr)
  return hours * 60 + minutes
}

/**
 * @param {number} totalMinutes
 * @param {string} [sampleTimeStr] - preserve 12h vs 24h style
 */
export function formatTimeFromMinutes(totalMinutes, sampleTimeStr) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const sample = String(sampleTimeStr || "").trim()
  if (/^\d{1,2}:\d{2}$/.test(sample)) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }
  return formatTime12h(h, m)
}

/**
 * Compact non-skipped activities into a continuous day schedule.
 * Keeps the first active activity at its current start time; later items follow
 * sequentially (duration + travel buffer).
 *
 * @param {object[]} activities
 * @param {{ travelBufferMin?: number }} [options]
 * @returns {{ activities: object[], updates: Array<{ activityId: string, name: string, previousTime: string, time: string }>, shifted: number }}
 */
export function reflowDaySchedule(activities, options = {}) {
  const bufferMin = options.travelBufferMin ?? DEFAULT_TRAVEL_BUFFER_MIN
  const sorted = [...(activities || [])].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time) || 0,
  )

  const updates = []
  const activeIndices = sorted
    .map((act, index) => (!act.skipped ? index : -1))
    .filter((index) => index >= 0)

  if (activeIndices.length === 0) {
    return { activities: sorted, updates, shifted: 0 }
  }

  const firstActive = sorted[activeIndices[0]]
  let cursor = timeToMinutes(firstActive.time)
  const sampleTime = firstActive.time

  for (let idx = 0; idx < activeIndices.length; idx += 1) {
    const act = sorted[activeIndices[idx]]
    const currentMinutes = timeToMinutes(act.time)
    if (currentMinutes !== cursor) {
      const newTime = formatTimeFromMinutes(cursor, act.time || sampleTime)
      updates.push({
        activityId: String(act._id || act.id),
        name: act.name,
        previousTime: act.time,
        time: newTime,
      })
      act.time = newTime
    }
    if (idx < activeIndices.length - 1) {
      cursor += parseDurationMinutes(act.duration) + bufferMin
    }
  }

  return { activities: sorted, updates, shifted: updates.length }
}

/**
 * Mark an activity skipped and reflow the rest of the day.
 * @param {object[]} activities
 * @param {string} activityId
 * @param {boolean} skipped
 */
export function applyActivitySkipAndReflow(activities, activityId, skipped = true) {
  const list = (activities || []).map((a) => ({
    ...a,
    skipped: Boolean(a.skipped),
  }))
  const target = list.find((a) => String(a._id || a.id) === String(activityId))
  if (!target) {
    const err = new Error("Activity not found on this day")
    err.statusCode = 404
    throw err
  }

  target.skipped = Boolean(skipped)
  const { activities: reflowed, updates, shifted } = reflowDaySchedule(list)
  return {
    activities: reflowed,
    updates,
    shifted,
    skippedActivity: target,
  }
}
