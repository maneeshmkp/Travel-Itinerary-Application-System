/** Compact itinerary snapshot for copilot context (shared with ItineraryDetail). */
export function itineraryToAiSnapshot(it) {
  if (!it) return null
  return {
    id: it._id || it.id,
    title: it.title,
    destination: it.destination,
    numberOfNights: it.numberOfNights,
    totalDays: it.totalDays,
    description: it.description,
    highlights: it.highlights || [],
    tags: it.tags || [],
    budget: it.budget,
    budgetInsight: it.budgetInsight,
    days: (it.days || []).map((d) => ({
      dayNumber: d.dayNumber,
      dayLabel: d.dayLabel || "",
      hotel: d.hotel,
      activities: (d.activities || []).map((a) => ({
        _id: a._id,
        name: a.name,
        description: a.description,
        time: a.time,
        location: a.location,
        category: a.category,
        duration: a.duration,
        cost: a.cost,
        latitude: a.latitude,
        longitude: a.longitude,
      })),
    })),
  }
}
