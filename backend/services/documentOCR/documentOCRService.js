const DATE_PATTERNS = [
  /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g,
  /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g,
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi,
]

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

function parseDateMatch(m, patternIdx) {
  try {
    if (patternIdx === 2) {
      const d = new Date(Number(m[3]), MONTHS[m[2].slice(0, 3).toLowerCase()], Number(m[1]))
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (patternIdx === 1) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1]))
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function extractDates(text) {
  const dates = []
  DATE_PATTERNS.forEach((pattern, idx) => {
    const re = new RegExp(pattern.source, pattern.flags)
    let m
    while ((m = re.exec(text)) !== null) {
      const d = parseDateMatch(m, idx)
      if (d) dates.push(d)
    }
  })
  return dates.sort((a, b) => a - b)
}

export function extractFieldsFromText(text, documentType) {
  const t = String(text || "")
  const fields = {
    travelerName: "",
    passportNumber: "",
    visaNumber: "",
    flightNumber: "",
    bookingReference: "",
    hotelName: "",
    issueDate: null,
    expiryDate: null,
  }

  const passportMatch = t.match(/\b[A-Z]{1,2}\d{6,9}\b/) || t.match(/\bP\s*<?\s*([A-Z0-9]{6,12})/i)
  if (passportMatch) fields.passportNumber = (passportMatch[1] || passportMatch[0]).replace(/\s/g, "")

  const visaMatch = t.match(/visa\s*(?:no\.?|number)?[:\s]*([A-Z0-9]{6,15})/i)
  if (visaMatch) fields.visaNumber = visaMatch[1]

  const flightMatch = t.match(/\b([A-Z]{2}\s?\d{2,4})\b/) || t.match(/flight\s*#?\s*([A-Z0-9]{3,8})/i)
  if (flightMatch) fields.flightNumber = flightMatch[1].replace(/\s/g, "")

  const pnrMatch = t.match(/(?:PNR|booking|confirmation|reference)[:\s#]*([A-Z0-9]{5,10})/i)
  if (pnrMatch) fields.bookingReference = pnrMatch[1]

  const hotelMatch = t.match(/(?:hotel|property|resort)[:\s]*([A-Za-z0-9\s&'.-]{3,60})/i)
  if (hotelMatch) fields.hotelName = hotelMatch[1].trim().slice(0, 120)

  const nameMatch = t.match(/(?:name|passenger|guest)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/)
  if (nameMatch) fields.travelerName = nameMatch[1].trim()

  const dates = extractDates(t)
  if (dates.length >= 2) {
    fields.issueDate = dates[0]
    fields.expiryDate = dates[dates.length - 1]
  } else if (dates.length === 1) {
    if (documentType === "passport" || documentType === "visa" || documentType === "travel_insurance") {
      fields.expiryDate = dates[0]
    } else {
      fields.issueDate = dates[0]
    }
  }

  const expiryLabel = t.match(/expir(?:y|es|ation)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)
  if (expiryLabel) {
    const d = extractDates(expiryLabel[1])[0]
    if (d) fields.expiryDate = d
  }

  return fields
}

async function geminiVisionOcr(buffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash"
  const base64 = buffer.toString("base64")
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const prompt = `Extract travel document text. Return JSON only:
{"fullText":"...","travelerName":"","passportNumber":"","visaNumber":"","flightNumber":"","bookingReference":"","hotelName":"","issueDate":"YYYY-MM-DD or null","expiryDate":"YYYY-MM-DD or null"}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  try {
    const parsed = JSON.parse(text)
    return {
      ocrText: String(parsed.fullText || "").slice(0, 50000),
      ocrFields: {
        travelerName: parsed.travelerName || "",
        passportNumber: parsed.passportNumber || "",
        visaNumber: parsed.visaNumber || "",
        flightNumber: parsed.flightNumber || "",
        bookingReference: parsed.bookingReference || "",
        hotelName: parsed.hotelName || "",
        issueDate: parsed.issueDate ? new Date(parsed.issueDate) : null,
        expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
      },
      source: "gemini",
    }
  } catch {
    return { ocrText: text.slice(0, 50000), ocrFields: extractFieldsFromText(text), source: "gemini" }
  }
}

export async function runDocumentOcr({ buffer, mimeType, documentType, title }) {
  if (mimeType?.startsWith("image/") || mimeType === "application/pdf") {
    const gemini = await geminiVisionOcr(buffer, mimeType).catch(() => null)
    if (gemini?.ocrText) return gemini
  }

  const fallbackText = String(title || "")
  const ocrFields = extractFieldsFromText(fallbackText, documentType)
  return {
    ocrText: fallbackText,
    ocrFields,
    source: "regex",
  }
}
