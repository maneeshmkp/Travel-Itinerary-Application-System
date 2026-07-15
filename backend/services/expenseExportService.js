function escapeCsv(value) {
  const s = String(value ?? "")
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildExpenseCsv(report) {
  const lines = []
  const { trip, currency, budget, byCategory, daily, expenses } = report

  lines.push("Trip Expense Report")
  lines.push(`Trip,${escapeCsv(trip.title)}`)
  lines.push(`Destination,${escapeCsv(trip.destination)}`)
  lines.push(`Currency,${currency}`)
  lines.push(`Planned Budget,${budget.planned}`)
  lines.push(`Actual Spent,${budget.actual}`)
  lines.push(`Remaining,${budget.remaining}`)
  lines.push("")

  lines.push("Category Summary")
  lines.push("Category,Planned,Actual,Difference,Status")
  for (const row of byCategory) {
    lines.push(
      [row.label, row.planned, row.actual, row.difference, row.status].map(escapeCsv).join(","),
    )
  }
  lines.push("")

  lines.push("Daily Summary")
  lines.push("Day,Total")
  for (const day of daily.timeline) {
    lines.push([`Day ${day.dayNumber}`, day.total].join(","))
  }
  lines.push("")

  lines.push("Expense List")
  lines.push("Date,Day,Category,Description,Payment Method,Amount,Currency,Notes")
  for (const e of expenses) {
    lines.push(
      [
        e.spentAt ? new Date(e.spentAt).toISOString().slice(0, 10) : "",
        e.dayNumber ?? "",
        e.category,
        e.description,
        e.paymentMethod,
        e.amount,
        e.currency,
        e.notes,
      ]
        .map(escapeCsv)
        .join(","),
    )
  }

  return lines.join("\n")
}

export async function buildExpensePdfBuffer(report) {
  const PDFDocument = (await import("pdfkit")).default
  const doc = new PDFDocument({ margin: 50 })
  const chunks = []

  return new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const { trip, currency, budget, byCategory, expenses } = report

    doc.fontSize(18).text("Trip Expense Report", { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11).text(`Trip: ${trip.title}`)
    doc.text(`Destination: ${trip.destination}`)
    doc.text(`Currency: ${currency}`)
    doc.moveDown()
    doc.text(`Planned budget: ${budget.planned} ${currency}`)
    doc.text(`Actual spent: ${budget.actual} ${currency}`)
    doc.text(`Remaining: ${budget.remaining} ${currency}`)
    if (budget.percentUsed != null) doc.text(`Budget used: ${budget.percentUsed}%`)
    doc.moveDown()

    doc.fontSize(13).text("By category")
    doc.fontSize(10)
    for (const row of byCategory.filter((r) => r.planned > 0 || r.actual > 0)) {
      doc.text(`${row.label}: planned ${row.planned} | actual ${row.actual} | ${row.status}`)
    }
    doc.moveDown()

    doc.fontSize(13).text("Expenses")
    doc.fontSize(10)
    for (const e of expenses.slice(0, 80)) {
      const date = e.spentAt ? new Date(e.spentAt).toLocaleDateString() : "—"
      doc.text(
        `${date} · Day ${e.dayNumber ?? "—"} · ${e.category} · ${e.description} · ${e.amount} ${e.currency}`,
      )
    }

    doc.end()
  })
}
