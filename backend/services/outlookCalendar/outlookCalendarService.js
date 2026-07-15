const MS_AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
const MS_TOKEN = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
const GRAPH = "https://graph.microsoft.com/v1.0"

export function isOutlookCalendarConfigured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
}

export function getOutlookAuthUrl(state) {
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:5000"}/api/calendar/outlook/callback`
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "offline_access Calendars.ReadWrite User.Read",
    state,
  })
  return `${MS_AUTH}?${params.toString()}`
}

export async function exchangeOutlookCode(code) {
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:5000"}/api/calendar/outlook/callback`
  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || "Outlook token exchange failed")
  return data
}

export async function refreshOutlookToken(refreshToken) {
  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access Calendars.ReadWrite User.Read",
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || "Outlook refresh failed")
  return data
}

export async function fetchOutlookEmail(accessToken) {
  const res = await fetch(`${GRAPH}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return ""
  const data = await res.json()
  return data.mail || data.userPrincipalName || ""
}

function toOutlookEventBody(ev) {
  return {
    subject: ev.title,
    body: { contentType: "Text", content: ev.description || "" },
    location: { displayName: ev.location || "" },
    start: { dateTime: new Date(ev.start).toISOString(), timeZone: "UTC" },
    end: { dateTime: new Date(ev.end).toISOString(), timeZone: "UTC" },
  }
}

export async function createOutlookEvent(accessToken, ev) {
  const res = await fetch(`${GRAPH}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toOutlookEventBody(ev)),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Failed to create Outlook event")
  return data
}

export async function updateOutlookEvent(accessToken, eventId, ev) {
  const res = await fetch(`${GRAPH}/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toOutlookEventBody(ev)),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Failed to update Outlook event")
  return data
}

export async function deleteOutlookEvent(accessToken, eventId) {
  const res = await fetch(`${GRAPH}/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 404) return true
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message || "Failed to delete Outlook event")
  }
  return true
}

export async function listOutlookEvents(accessToken, start, end) {
  const filter = []
  if (start) filter.push(`start/dateTime ge '${new Date(start).toISOString()}'`)
  if (end) filter.push(`end/dateTime le '${new Date(end).toISOString()}'`)
  const params = new URLSearchParams({ $top: "100", $orderby: "start/dateTime" })
  if (filter.length) params.set("$filter", filter.join(" and "))

  const res = await fetch(`${GRAPH}/me/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Failed to list Outlook events")
  return data.value || []
}
