/** Distinct stroke + marker tint per day (day-wise grouping on itinerary maps). */
export const DAY_PALETTE = [
  { stroke: "#2563eb", dot: "blue" },
  { stroke: "#059669", dot: "green" },
  { stroke: "#d97706", dot: "orange" },
  { stroke: "#dc2626", dot: "red" },
  { stroke: "#7c3aed", dot: "purple" },
  { stroke: "#db2777", dot: "pink" },
  { stroke: "#0d9488", dot: "yellow" },
  { stroke: "#4f46e5", dot: "blue" },
]

export function markerIconForDay(dayNumber) {
  const idx = Math.max(0, Number(dayNumber) - 1) % DAY_PALETTE.length
  const dot = DAY_PALETTE[idx].dot
  return `https://maps.google.com/mapfiles/ms/icons/${dot}-dot.png`
}

export function hasValidCoords(activity) {
  const lat = Number(activity?.latitude)
  const lng = Number(activity?.longitude)
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/** @returns {Array<{ dayId, dayNumber, dayLabel, color, path: Array<{ lat, lng, id, title, dayNumber, dotIcon }> }>} */
export function buildDayRoutes(days) {
  return (days || []).map((day, index) => {
    const color = DAY_PALETTE[index % DAY_PALETTE.length]
    const path = (day.activities || [])
      .filter(hasValidCoords)
      .map((a) => ({
        lat: Number(a.latitude),
        lng: Number(a.longitude),
        id: a._id,
        title: a.name || "Activity",
        dayNumber: day.dayNumber,
        dotIcon: markerIconForDay(day.dayNumber),
      }))
    return {
      dayId: day._id,
      dayNumber: day.dayNumber,
      dayLabel: (day.dayLabel || "").trim(),
      color,
      path,
    }
  })
}

export function routesToMapProps(routes) {
  const flatMarkers = routes.flatMap((r) => r.path.map((p) => ({ ...p, color: r.color })))
  const markers = flatMarkers.map((m) => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    title: `Day ${m.dayNumber}: ${m.title}`,
    label: String(m.dayNumber),
    icon: m.dotIcon,
    dayNumber: m.dayNumber,
    strokeColor: m.color?.stroke,
  }))
  const polylines = routes
    .filter((r) => r.path.length >= 2)
    .map((r) => ({
      path: r.path.map(({ lat, lng }) => ({ lat, lng })),
      color: r.color.stroke,
      zIndex: r.dayNumber,
    }))
  return { markers, polylines, flatMarkers, routes }
}
