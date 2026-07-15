/**
 * Resolve approximate coordinates from the client's public IP (server-side).
 * Used when browser geolocation returns coarse network estimates (~50 km).
 */
export async function geolocateClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"]?.trim() ||
    req.socket?.remoteAddress ||
    ""

  if (ip.startsWith("::ffff:")) ip = ip.slice(7)
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null
  }

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,lat,lon,city,regionName,country`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.status !== "success" || !Number.isFinite(data.lat) || !Number.isFinite(data.lon)) {
      return null
    }

    const label = [data.city, data.regionName, data.country].filter(Boolean).join(", ")
    return {
      latitude: data.lat,
      longitude: data.lon,
      accuracy: 15000,
      source: "ip",
      label,
    }
  } catch {
    return null
  }
}
