const AIRPORT_DB = {
  DEL: { name: "Indira Gandhi International", city: "New Delhi", lat: 28.5562, lng: 77.1 },
  BOM: { name: "Chhatrapati Shivaji Maharaj International", city: "Mumbai", lat: 19.0896, lng: 72.8656 },
  BLR: { name: "Kempegowda International", city: "Bengaluru", lat: 13.1986, lng: 77.7066 },
  GOI: { name: "Goa International (Dabolim)", city: "Goa", lat: 15.3808, lng: 73.8314 },
  JAI: { name: "Jaipur International", city: "Jaipur", lat: 26.8242, lng: 75.8122 },
  SXR: { name: "Sheikh ul-Alam International", city: "Srinagar", lat: 33.9871, lng: 74.7742 },
  IXJ: { name: "Jammu Airport", city: "Jammu", lat: 32.6891, lng: 74.8373 },
  CCU: { name: "Netaji Subhas Chandra Bose International", city: "Kolkata", lat: 22.6547, lng: 88.4467 },
  MAA: { name: "Chennai International", city: "Chennai", lat: 12.9941, lng: 80.1709 },
  HYD: { name: "Rajiv Gandhi International", city: "Hyderabad", lat: 17.2403, lng: 78.4294 },
}

function codeKey(code) {
  return String(code || "").toUpperCase().slice(0, 4)
}

export function getAirportInfo(code) {
  const key = codeKey(code)
  const base = AIRPORT_DB[key] || {
    name: `${key} Airport`,
    city: key,
    lat: null,
    lng: null,
  }

  return {
    code: key,
    name: base.name,
    city: base.city,
    terminal: null,
    securityWaitMinutes: 15 + (key.charCodeAt(0) % 20),
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base.name + " airport")}`,
    amenities: {
      lounge: `Terminal lounge near Gate ${String.fromCharCode(65 + (key.length % 3))}${(key.charCodeAt(1) % 10) + 1}`,
      restaurant: "Food court — departures level",
      atm: "ATM — arrivals hall",
      medical: "Medical room — terminal entrance",
    },
    coordinates: base.lat != null ? { lat: base.lat, lng: base.lng } : null,
    demo: !AIRPORT_DB[key],
  }
}

export async function getAirportWeather(code) {
  try {
    const { getWeatherForDate } = await import("../weatherService.js")
    const info = getAirportInfo(code)
    const today = new Date().toISOString().slice(0, 10)
    const wx = await getWeatherForDate(info.city || code, today)
    return {
      code: codeKey(code),
      forecast: wx,
      warning: wx?.condition?.includes?.("rain") || String(wx?.label || "").toLowerCase().includes("storm")
        ? "Bad weather may delay flights"
        : null,
    }
  } catch {
    return { code: codeKey(code), forecast: null, warning: null }
  }
}
