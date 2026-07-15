function escapeCsv(value) {
  const s = String(value ?? "")
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildAnalyticsCsv(data) {
  const lines = []
  lines.push("Personal Travel Analytics Report")
  lines.push(`Generated,${new Date().toISOString()}`)
  lines.push("")
  lines.push("Metric,Value")
  const rows = [
    ["Total Trips", data.totalTrips],
    ["Completed Trips", data.completedTrips],
    ["Cancelled Trips", data.cancelledTrips],
    ["Countries Visited", (data.countriesVisited || []).join("; ")],
    ["Cities Visited", (data.citiesVisited || []).length],
    ["Total Travel Days", data.totalTravelDays],
    ["Total Spent", data.totalSpent],
    ["Average Budget", data.averageBudget],
    ["Average Actual Expense", data.averageActualExpense],
    ["Money Saved (AI)", data.moneySaved],
    ["Total Distance (km)", data.totalDistance],
    ["Travel Score", data.travelScore],
    ["Favorite Destination", data.favoriteDestination],
    ["Favorite Country", data.favoriteCountry],
    ["Favorite Category", data.favoriteCategory],
    ["Average Rating", data.averageRating],
  ]
  for (const [k, v] of rows) {
    lines.push(`${escapeCsv(k)},${escapeCsv(v)}`)
  }

  if (data.timeline?.length) {
    lines.push("")
    lines.push("Timeline")
    lines.push("Year,Title,Destination,Days,Status")
    for (const t of data.timeline) {
      lines.push([t.year, t.title, t.destination, t.totalDays, t.status].map(escapeCsv).join(","))
    }
  }

  if (data.achievements?.length) {
    lines.push("")
    lines.push("Achievements")
    lines.push("Title,Description")
    for (const a of data.achievements) {
      lines.push([a.title, a.description].map(escapeCsv).join(","))
    }
  }

  return lines.join("\n")
}

export async function buildAnalyticsPdfBuffer(data, { year } = {}) {
  const PDFDocument = (await import("pdfkit")).default
  const doc = new PDFDocument({ margin: 50 })
  const chunks = []

  return new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const title = year ? `Travel Report ${year}` : "Personal Travel Analytics"
    doc.fontSize(20).text(title, { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11).text(`Travel Score: ${data.travelScore}/100 (${data.travelScoreLabel})`)
    doc.text(`Total trips: ${data.totalTrips} | Completed: ${data.completedTrips}`)
    doc.text(`Countries: ${(data.countriesVisited || []).join(", ") || "—"}`)
    doc.text(`Total spent: ${data.totalSpent} | Saved with AI: ${data.moneySaved}`)
    doc.moveDown()

    if (data.insights?.length) {
      doc.fontSize(13).text("Insights", { underline: true })
      data.insights.forEach((tip) => doc.fontSize(10).text(`• ${tip}`))
      doc.moveDown()
    }

    if (data.aiRecommendations?.nextDestination) {
      doc.fontSize(13).text("AI Recommendations", { underline: true })
      const r = data.aiRecommendations
      doc.fontSize(10).text(`Next destination: ${r.nextDestination}`)
      doc.text(`Best month: ${r.bestMonth}`)
      doc.text(`Estimated budget: ${r.estimatedBudget}`)
      doc.text(`Duration: ${r.recommendedDuration} days`)
      doc.moveDown()
    }

    if (data.achievements?.length) {
      doc.fontSize(13).text("Achievements", { underline: true })
      data.achievements.forEach((a) => doc.fontSize(10).text(`${a.icon || "🏅"} ${a.title} — ${a.description}`))
      doc.moveDown()
    }

    if (data.timeline?.length) {
      doc.fontSize(13).text("Timeline", { underline: true })
      data.timeline.slice(0, 20).forEach((t) => {
        doc.fontSize(10).text(`${t.year} — ${t.title} (${t.destination})`)
      })
    }

    doc.end()
  })
}
