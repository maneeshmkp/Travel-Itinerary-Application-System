import PDFDocument from "pdfkit"

const PAGE_BOTTOM = 742

function safeText(value, max = 500) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

function safeFilename(title) {
  const base = String(title || "itinerary")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  return base || "itinerary"
}

function formatMoney(amount, currency = "USD") {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ""
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

function ensureSpace(doc, needed = 72) {
  if (doc.y + needed > PAGE_BOTTOM) doc.addPage()
}

function writeSectionTitle(doc, title) {
  ensureSpace(doc, 40)
  doc.moveDown(0.4)
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#1e3a5f").text(title)
  doc.moveDown(0.25)
  doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke()
  doc.moveDown(0.35)
}

/**
 * @param {object} itinerary - populated itinerary with budgetInsight
 * @param {{ publicUrl?: string }} [options]
 */
export function generateItineraryPdfBuffer(itinerary, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true })
    const chunks = []

    doc.on("data", (chunk) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const currency = itinerary.budget?.currency || itinerary.budgetInsight?.currency || "USD"
    const publicUrl = options.publicUrl || ""

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a").text(safeText(itinerary.title, 120))
    doc.moveDown(0.2)
    doc.font("Helvetica").fontSize(12).fillColor("#334155").text(safeText(itinerary.destination, 120))
    doc.moveDown(0.15)

    const meta = [
      `${itinerary.numberOfNights} nights · ${itinerary.totalDays || itinerary.numberOfNights + 1} days`,
      itinerary.bestTimeToVisit ? `Best time: ${safeText(itinerary.bestTimeToVisit, 80)}` : null,
    ].filter(Boolean)

    doc.fontSize(10).fillColor("#64748b").text(meta.join("  ·  "))
    doc.moveDown(0.5)

    if (itinerary.description) {
      writeSectionTitle(doc, "Overview")
      doc.font("Helvetica").fontSize(10).fillColor("#334155").text(safeText(itinerary.description, 1200), {
        align: "left",
        lineGap: 2,
      })
    }

    if (Array.isArray(itinerary.highlights) && itinerary.highlights.length > 0) {
      writeSectionTitle(doc, "Highlights")
      doc.font("Helvetica").fontSize(10).fillColor("#334155")
      for (const item of itinerary.highlights.slice(0, 12)) {
        ensureSpace(doc, 18)
        doc.text(`• ${safeText(item, 120)}`)
      }
    }

    if (Array.isArray(itinerary.tags) && itinerary.tags.length > 0) {
      writeSectionTitle(doc, "Travel style")
      doc.font("Helvetica").fontSize(10).fillColor("#334155").text(itinerary.tags.map((t) => safeText(t, 30)).join(", "))
    }

    const insight = itinerary.budgetInsight
    if (insight?.totalBudget > 0 || itinerary.budget?.min || itinerary.budget?.max) {
      writeSectionTitle(doc, "Budget")
      doc.font("Helvetica").fontSize(10).fillColor("#334155")
      const lines = []
      if (itinerary.budget?.min != null || itinerary.budget?.max != null) {
        const min = itinerary.budget?.min != null ? formatMoney(itinerary.budget.min, currency) : "—"
        const max = itinerary.budget?.max != null ? formatMoney(itinerary.budget.max, currency) : "—"
        lines.push(`Planned range: ${min} – ${max}`)
      }
      if (insight?.totalBudget > 0) {
        lines.push(`Activity total: ${formatMoney(insight.totalBudget, currency)}`)
        lines.push(`Average per day: ${formatMoney(insight.costPerDay, currency)}`)
      }
      doc.text(lines.join("\n"), { lineGap: 2 })
    }

    writeSectionTitle(doc, "Day-by-day plan")

    const days = Array.isArray(itinerary.days) ? [...itinerary.days].sort((a, b) => a.dayNumber - b.dayNumber) : []

    for (const day of days) {
      ensureSpace(doc, 100)
      const dayTitle = day.dayLabel
        ? `Day ${day.dayNumber} — ${safeText(day.dayLabel, 80)}`
        : `Day ${day.dayNumber}`

      doc.font("Helvetica-Bold").fontSize(12).fillColor("#1e40af").text(dayTitle)
      doc.moveDown(0.2)

      if (day.hotel?.name) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#334155")
          .text(`Stay: ${safeText(day.hotel.name, 80)}`, { continued: false })
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#64748b")
          .text(safeText(day.hotel.location, 100))
        doc.moveDown(0.25)
      }

      const activities = Array.isArray(day.activities) ? day.activities : []
      if (activities.length === 0) {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#94a3b8").text("No activities listed.")
        doc.moveDown(0.4)
        continue
      }

      for (const activity of activities) {
        ensureSpace(doc, 64)
        const skipped = Boolean(activity.skipped)
        const timePrefix = skipped ? "[Skipped] " : ""
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(skipped ? "#94a3b8" : "#0f172a")
          .text(`${timePrefix}${safeText(activity.time, 20)}  ${safeText(activity.name, 100)}`)
        doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(safeText(activity.location, 120))
        if (activity.description) {
          doc.font("Helvetica").fontSize(9).fillColor("#475569").text(safeText(activity.description, 400), { lineGap: 1 })
        }
        const extras = [
          activity.category ? `Category: ${activity.category}` : null,
          activity.duration ? `Duration: ${activity.duration}` : null,
          activity.cost > 0 ? `Est. cost: ${formatMoney(activity.cost, currency)}` : null,
        ].filter(Boolean)
        if (extras.length) {
          doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(extras.join("  ·  "))
        }
        doc.moveDown(0.35)
      }
      doc.moveDown(0.2)
    }

    ensureSpace(doc, 50)
    doc.moveDown(0.5)
    doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.4)
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
    doc.text(`Generated by TravelPlan · ${new Date().toLocaleString("en-US")}`)
    if (publicUrl) {
      doc.text(`View online: ${publicUrl}`, { link: publicUrl, underline: true })
    }

    doc.end()
  })
}

export { safeFilename }
