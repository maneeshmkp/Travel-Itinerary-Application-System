const DEFAULT_HOST = "https://test.api.amadeus.com"

let cachedToken = null
let tokenExpiresAt = 0

export function isAmadeusConfigured() {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID?.trim() && process.env.AMADEUS_CLIENT_SECRET?.trim(),
  )
}

function getHost() {
  return (process.env.AMADEUS_API_HOST || DEFAULT_HOST).replace(/\/+$/, "")
}

export async function getAmadeusAccessToken() {
  if (!isAmadeusConfigured()) {
    throw new Error("Amadeus API credentials are not configured")
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const res = await fetch(`${getHost()}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID.trim(),
      client_secret: process.env.AMADEUS_CLIENT_SECRET.trim(),
    }),
  })

  const raw = await res.text()
  if (!res.ok) {
    throw new Error(`Amadeus auth failed (${res.status}): ${raw.slice(0, 200)}`)
  }

  const data = JSON.parse(raw)
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (Number(data.expires_in) || 1800) * 1000
  return cachedToken
}

export async function amadeusGet(path, query = {}) {
  const token = await getAmadeusAccessToken()
  const url = new URL(`${getHost()}${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  const raw = await res.text()
  if (!res.ok) {
    const err = new Error(`Amadeus ${path} failed (${res.status})`)
    err.status = res.status
    err.body = raw.slice(0, 500)
    throw err
  }

  return raw ? JSON.parse(raw) : {}
}

/** Clear cached token (tests). */
export function clearAmadeusTokenCache() {
  cachedToken = null
  tokenExpiresAt = 0
}
