import { haversineKm } from "../utils/itineraryOptimizer.js"
import { hasValidCoordinates } from "../utils/geocodingQueryBuilder.js"
import { createRiskItem } from "../utils/riskHelpers.js"
import { optimizeActivityOrder } from "../utils/itineraryOptimizer.js"

function parseTimeToMinutes(timeStr) {
  const m = String(timeStr || "").match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function parseDurationMinutes(duration) {
  const s = String(duration || "").toLowerCase()
  const h = s.match(/(\d+)\s*h/)
  const min = s.match(/(\d+)\s*m/)
  let total = 0
  if (h) total += Number(h[1]) * 60
  if (min) total += Number(min[1])
  if (!h && !min) {
    const n = Number(s)
    if (Number.isFinite(n) && n > 0) total = n * 60
  }
  return total || 90
}

export function detectScheduleRisks(trip) {
  const risks = []
  const days = trip.days || []

  for (const day of days) {
    const activities = (day.activities || []).filter((a) => !a.skipped)
    const dayNum = day.dayNumber

    for (let i = 0; i < activities.length; i += 1) {
      const a = activities[i]
      const startA = parseTimeToMinutes(a.time)
      const durA = parseDurationMinutes(a.duration)
      if (startA == null) continue

      const endA = startA + durA

      if (startA >= 22 * 60 || endA >= 24 * 60) {
        risks.push(
          createRiskItem({
            riskType: "late_night_travel",
            severity: "MEDIUM",
            title: `Late activity on Day ${dayNum}`,
            description: `"${a.name}" runs late (${a.time}) — limited transport and safety concerns.`,
            affectedDay: dayNum,
            affectedActivityIds: [String(a._id)],
            source: "schedule",
            recommendation: {
              suggestions: [
                "Book return transport in advance",
                "Share live location with travel companions",
                "Consider moving activity earlier",
              ],
            },
          }),
        )
      }

      for (let j = i + 1; j < activities.length; j += 1) {
        const b = activities[j]
        const startB = parseTimeToMinutes(b.time)
        if (startB == null) continue
        if (startB < endA) {
          risks.push(
            createRiskItem({
              riskType: "overlapping_activities",
              severity: "HIGH",
              title: `Schedule overlap on Day ${dayNum}`,
              description: `"${a.name}" overlaps with "${b.name}" (${a.time} vs ${b.time}).`,
              affectedDay: dayNum,
              affectedActivityIds: [String(a._id), String(b._id)],
              source: "schedule",
              recommendation: {
                title: "Adjust activity times",
                suggestions: [
                  `Move "${b.name}" to ${Math.floor(endA / 60)}:${String(endA % 60).padStart(2, "0")}`,
                  "Skip one activity or split across days",
                ],
              },
            }),
          )
        }
        break
      }
    }

    for (let i = 1; i < activities.length; i += 1) {
      const prev = activities[i - 1]
      const curr = activities[i]
      if (!hasValidCoordinates(prev) || !hasValidCoordinates(curr)) continue
      const km = haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
      const estMinutes = (km / 30) * 60
      if (km >= 25 || estMinutes >= 75) {
        risks.push(
          createRiskItem({
            riskType: "long_travel_time",
            severity: km >= 40 ? "HIGH" : "MEDIUM",
            title: `Long travel on Day ${dayNum}`,
            description: `~${Math.round(km)} km between "${prev.name}" and "${curr.name}" (~${Math.round(estMinutes)} min).`,
            affectedDay: dayNum,
            affectedActivityIds: [String(prev._id), String(curr._id)],
            source: "schedule",
            recommendation: {
              title: "Optimize route order",
              suggestions: [
                "Reorder stops to reduce backtracking",
                "Leave 30 minutes earlier for traffic",
                "Use metro or pre-booked taxi",
              ],
              transportTip: `Allow at least ${Math.round(estMinutes + 15)} minutes between stops.`,
            },
            metadata: { distanceKm: Math.round(km * 10) / 10, estMinutes: Math.round(estMinutes) },
          }),
        )
      }
      if (km >= 15 && estMinutes >= 45) {
        risks.push(
          createRiskItem({
            riskType: "traffic_congestion",
            severity: "LOW",
            title: `Possible traffic delay on Day ${dayNum}`,
            description: `Urban segment between "${prev.name}" and "${curr.name}" may face congestion.`,
            affectedDay: dayNum,
            source: "schedule",
            recommendation: {
              suggestions: ["Use metro during rush hour", "Leave hotel 30 minutes earlier"],
            },
            metadata: { distanceKm: Math.round(km * 10) / 10 },
          }),
        )
      }
    }

    const geocoded = activities.filter(hasValidCoordinates)
    if (geocoded.length >= 3) {
      const { reordered, activities: optimized } = optimizeActivityOrder(activities)
      if (reordered) {
        risks.push(
          createRiskItem({
            riskType: "schedule_conflict",
            severity: "LOW",
            title: `Route can be optimized on Day ${dayNum}`,
            description: "Activities are not in the most efficient geographic order.",
            affectedDay: dayNum,
            source: "schedule",
            recommendation: {
              title: "Reorder for shorter travel",
              suggestions: optimized.slice(0, 4).map((a, idx) => `${idx + 1}. ${a.name} (${a.time || "TBD"})`),
            },
            metadata: { suggestedOrder: optimized.map((a) => a.name) },
          }),
        )
      }
    }
  }

  return risks
}

export function buildRouteAnalysis(trip) {
  const days = []
  for (const day of trip.days || []) {
    const activities = (day.activities || []).filter((a) => !a.skipped)
    let totalKm = 0
    const segments = []
    for (let i = 1; i < activities.length; i += 1) {
      const prev = activities[i - 1]
      const curr = activities[i]
      if (!hasValidCoordinates(prev) || !hasValidCoordinates(curr)) continue
      const km = haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
      totalKm += km
      segments.push({ from: prev.name, to: curr.name, km: Math.round(km * 10) / 10 })
    }
    days.push({ dayNumber: day.dayNumber, totalKm: Math.round(totalKm * 10) / 10, segments })
  }
  return days
}
