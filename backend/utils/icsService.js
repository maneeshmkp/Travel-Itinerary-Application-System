function escapeIcs(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function formatIcsDate(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

export function generateIcsCalendar(events, { name = "TravelPlan Trip", prodId = "-//TravelPlan//Trip Calendar//EN" } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(name)}`,
  ]

  for (const ev of events) {
    if (!ev.start || !ev.end) continue
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${escapeIcs(ev.uid)}`)
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`)
    lines.push(`DTSTART:${formatIcsDate(ev.start)}`)
    lines.push(`DTEND:${formatIcsDate(ev.end)}`)
    lines.push(`SUMMARY:${escapeIcs(ev.title)}`)
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`)
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`)
    if (ev.latitude != null && ev.longitude != null) {
      lines.push(`GEO:${ev.latitude};${ev.longitude}`)
    }
    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

function unfoldIcsLines(text) {
  const raw = String(text || "").replace(/\r\n/g, "\n").split("\n")
  const out = []
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

function parseIcsDate(val) {
  if (!val) return null
  const s = val.trim()
  if (s.length === 8) {
    const y = s.slice(0, 4)
    const m = s.slice(4, 6)
    const d = s.slice(6, 8)
    return new Date(`${y}-${m}-${d}T00:00:00Z`)
  }
  if (s.endsWith("Z")) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`
    return new Date(iso)
  }
  return new Date(s)
}

export function parseIcsCalendar(icsText) {
  const lines = unfoldIcsLines(icsText)
  const events = []
  let current = null

  for (const line of lines) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).split(";")[0].toUpperCase()
    const value = line.slice(idx + 1)

    if (key === "BEGIN" && value.toUpperCase() === "VEVENT") {
      current = {}
    } else if (key === "END" && value.toUpperCase() === "VEVENT") {
      if (current) events.push(current)
      current = null
    } else if (current) {
      if (key === "UID") current.uid = value
      if (key === "SUMMARY") current.summary = value.replace(/\\n/g, "\n").replace(/\\,/g, ",")
      if (key === "DESCRIPTION") current.description = value.replace(/\\n/g, "\n")
      if (key === "LOCATION") current.location = value.replace(/\\,/g, ",")
      if (key === "DTSTART") current.start = parseIcsDate(value)
      if (key === "DTEND") current.end = parseIcsDate(value)
    }
  }

  return events
}
