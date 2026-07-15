import { categoryLabel, PACKING_CATEGORY_IDS } from "../../constants/packingCategories.js"
import { flattenCategories } from "../../utils/packingHelpers.js"

function escapeCsv(value) {
  const s = String(value ?? "")
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildPackingCsv(packing) {
  const lines = []
  lines.push("Packing Checklist")
  lines.push(`Trip,${escapeCsv(packing.tripTitle || packing.tripId)}`)
  lines.push(`Progress,${packing.progress?.percent || 0}%`)
  lines.push(`Estimated Weight (kg),${packing.estimatedWeight || 0}`)
  lines.push("")
  lines.push("Category,Item,Quantity,Packed,Essential,WeightKg")
  const items = flattenCategories(packing.categories).concat(packing.customItems || [])
  for (const item of items) {
    lines.push(
      [
        categoryLabel(item.category),
        item.name,
        item.quantity,
        item.packed ? "yes" : "no",
        item.essential ? "yes" : "no",
        item.weightKg,
      ]
        .map(escapeCsv)
        .join(","),
    )
  }
  return lines.join("\n")
}

export async function buildPackingPdfBuffer(packing, tripTitle = "Trip") {
  const PDFDocument = (await import("pdfkit")).default
  const doc = new PDFDocument({ margin: 50 })
  const chunks = []

  return new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.fontSize(18).text("Packing Checklist", { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11).text(`Trip: ${tripTitle}`)
    doc.text(`Progress: ${packing.progress?.percent || 0}% packed`)
    doc.text(`Estimated weight: ${packing.estimatedWeight || 0} kg`)
    if (packing.overweight) doc.fillColor("red").text("Warning: exceeds baggage allowance").fillColor("black")
    doc.moveDown()

    if (packing.insights?.length) {
      doc.fontSize(12).text("Smart insights", { underline: true })
      packing.insights.forEach((tip) => doc.fontSize(10).text(`• ${tip}`))
      doc.moveDown()
    }

    for (const cat of PACKING_CATEGORY_IDS) {
      const items = packing.categories?.[cat] || []
      if (!items.length) continue
      doc.fontSize(12).text(categoryLabel(cat), { underline: true })
      items.forEach((item) => {
        const mark = item.packed ? "[x]" : "[ ]"
        doc.fontSize(10).text(`${mark} ${item.name}${item.essential ? " *" : ""}`)
      })
      doc.moveDown(0.5)
    }

    doc.end()
  })
}
