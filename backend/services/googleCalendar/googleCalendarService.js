const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
const GOOGLE_CALENDAR = "https://www.googleapis.com/calendar/v3"

export function isGoogleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET)
}

export function getGoogleAuthUrl(state) {
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:5000"}/api/calendar/google/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${GOOGLE_AUTH}?${params.toString()}`
}

export async function exchangeGoogleCode(code) {
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:5000"}/api/calendar/google/callback`
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || "Google token exchange failed")
  return data
}

export async function refreshGoogleToken(refreshToken) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || "Google refresh failed")
  return data
}

export async function fetchGoogleEmail(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return ""
  const data = await res.json()
  return data.email || ""
}

function toGoogleEventBody(ev) {
  const body = {
    summary: ev.title,
    description: ev.description,
    location: ev.location,
    start: { dateTime: new Date(ev.start).toISOString(), timeZone: "UTC" },
    end: { dateTime: new Date(ev.end).toISOString(), timeZone: "UTC" },
  }
  if (ev.latitude != null && ev.longitude != null) {
    body.location = ev.location || `${ev.latitude},${ev.longitude}`
  }
  return body
}

export async function createGoogleEvent(accessToken, calendarId, ev) {
  const res = await fetch(`${GOOGLE_CALENDAR}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toGoogleEventBody(ev)),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Failed to create Google event")
  return data
}

export async function updateGoogleEvent(accessToken, calendarId, eventId, ev) {
  const res = await fetch(
    `${GOOGLE_CALENDAR}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGoogleEventBody(ev)),
    },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Failed to update Google event")
  return data
}

export async function deleteGoogleEvent(accessToken, calendarId, eventId) {
  const res = await fetch(
    `${GOOGLE_CALENDAR}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (res.status === 404) return true
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message || "Failed to delete Google event")
  }
  return true
}

export async function listGoogleEvents(accessToken, calendarId, timeMin, timeMax) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  })
  if (timeMin) params.set("timeMin", new Date(timeMin).toISOString())
  if (timeMax) params.set("timeMax", new Date(timeMax).toISOString())

  const res = await fetch(
    `${GOOGLE_CALENDAR}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Failed to list Google events")
  return data.items || []
}
