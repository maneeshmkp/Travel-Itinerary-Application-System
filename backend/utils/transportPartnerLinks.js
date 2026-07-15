function citySlug(place) {
  return String(place || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function cityTitle(place) {
  return String(place || "")
    .split(",")[0]
    .trim()
}

function toIsoDate(date) {
  if (!date) return null
  const raw = String(date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("-")
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

function toRedBusDoj(date) {
  const iso = toIsoDate(date)
  if (!iso) return null
  const [yyyy, mm, dd] = iso.split("-")
  return `${dd}-${mm}-${yyyy}`
}

/**
 * Deep links to bus search on partner sites (portfolio hand-off, not booking).
 */
export function buildBusPartnerLinks({ origin, destination, date }) {
  const from = citySlug(origin)
  const to = citySlug(destination)
  const fromName = cityTitle(origin)
  const toName = cityTitle(destination)
  const routeSlug = `${from}-to-${to}`
  const doj = toRedBusDoj(date)

  const redBus = new URL(`https://www.redbus.in/bus-tickets/${routeSlug}`)
  if (doj) redBus.searchParams.set("onward", doj)

  const mmt = new URL(`https://www.makemytrip.com/bus-tickets/${routeSlug}`)
  if (doj) mmt.searchParams.set("date", doj)

  const abhi = new URL(`https://www.abhibus.com/bus-tickets/${routeSlug}`)
  if (doj) abhi.searchParams.set("jdate", doj)

  const goibibo = new URL("https://www.goibibo.com/bus/")
  goibibo.searchParams.set("from", fromName)
  goibibo.searchParams.set("to", toName)
  if (doj) goibibo.searchParams.set("date", doj)

  return [
    {
      id: "redbus",
      label: "Book on redBus",
      icon: "🚌",
      provider: "redBus",
      url: redBus.toString(),
    },
    {
      id: "makemytrip",
      label: "Book on MakeMyTrip",
      icon: "🧳",
      provider: "MakeMyTrip",
      url: mmt.toString(),
    },
    {
      id: "abhibus",
      label: "Book on AbhiBus",
      icon: "🚌",
      provider: "AbhiBus",
      url: abhi.toString(),
    },
    {
      id: "goibibo",
      label: "Book on Goibibo",
      icon: "🎫",
      provider: "Goibibo",
      url: goibibo.toString(),
    },
  ]
}

/**
 * Deep links to train search on partner sites.
 */
export function buildTrainPartnerLinks({ origin, destination, date }) {
  const from = citySlug(origin)
  const to = citySlug(destination)
  const fromName = cityTitle(origin)
  const toName = cityTitle(destination)
  const routeSlug = `${from}-to-${to}`
  const iso = toIsoDate(date)

  const irctc = new URL("https://www.irctc.co.in/nget/train-search")

  const mmt = new URL(`https://www.makemytrip.com/railways/${routeSlug}-rail-ticket-booking.html`)
  if (iso) mmt.searchParams.set("date", iso)

  const goibibo = new URL(`https://www.goibibo.com/trains/${routeSlug}/`)
  if (iso) goibibo.searchParams.set("date", iso)

  const confirmTkt = new URL("https://www.confirmtkt.com/train-search")
  confirmTkt.searchParams.set("from", fromName)
  confirmTkt.searchParams.set("to", toName)
  if (iso) confirmTkt.searchParams.set("date", iso)

  const easeMyTrip = new URL("https://www.easemytrip.com/railways/")
  easeMyTrip.searchParams.set("from", fromName)
  easeMyTrip.searchParams.set("to", toName)
  if (iso) easeMyTrip.searchParams.set("date", iso)

  return [
    {
      id: "irctc",
      label: "Book on IRCTC",
      icon: "🚆",
      provider: "IRCTC",
      url: irctc.toString(),
    },
    {
      id: "makemytrip",
      label: "Book on MakeMyTrip",
      icon: "🧳",
      provider: "MakeMyTrip",
      url: mmt.toString(),
    },
    {
      id: "goibibo",
      label: "Book on Goibibo",
      icon: "🎫",
      provider: "Goibibo",
      url: goibibo.toString(),
    },
    {
      id: "confirmtkt",
      label: "Book on ConfirmTkt",
      icon: "🚆",
      provider: "ConfirmTkt",
      url: confirmTkt.toString(),
    },
    {
      id: "easemytrip",
      label: "Book on EaseMyTrip",
      icon: "✈️",
      provider: "EaseMyTrip",
      url: easeMyTrip.toString(),
    },
  ]
}

export function buildFlightPartnerLinks({ origin, destination, originCode, destinationCode, date }) {
  const from = cityTitle(origin || originCode)
  const to = cityTitle(destination || destinationCode)
  const iso = toIsoDate(date)

  const mmt = new URL("https://www.makemytrip.com/flights/")
  if (from) mmt.searchParams.set("from", from)
  if (to) mmt.searchParams.set("to", to)
  if (iso) mmt.searchParams.set("departure", iso)

  const goibibo = new URL("https://www.goibibo.com/flights/")
  goibibo.searchParams.set("from", from)
  goibibo.searchParams.set("to", to)
  if (iso) goibibo.searchParams.set("date", iso)

  return [
    { id: "makemytrip", label: "Book on MakeMyTrip", icon: "✈️", provider: "MakeMyTrip", url: mmt.toString() },
    { id: "goibibo", label: "Book on Goibibo", icon: "🎫", provider: "Goibibo", url: goibibo.toString() },
  ]
}
