import Itinerary from "../../models/Itinerary.js"
import Booking from "../../models/Booking.js"
import CalendarIntegration from "../../models/CalendarIntegration.js"
import CalendarEventLink from "../../models/CalendarEventLink.js"
import { buildTripCalendarEvents, detectConflicts, mapIcsEventToInternal } from "../../utils/calendarMapper.js"
import { generateIcsCalendar, parseIcsCalendar } from "../../utils/icsService.js"
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  refreshGoogleToken,
} from "../googleCalendar/googleCalendarService.js"
import {
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
  refreshOutlookToken,
} from "../outlookCalendar/outlookCalendarService.js"
import { notifyCalendarSync } from "../notifications/notificationTriggers.js"
import { canAccessTripData } from "../../utils/itineraryAccess.js"

async function loadTrip(tripId, userId) {
  const itinerary = await Itinerary.findById(tripId).populate({
    path: "days",
    populate: { path: "activities", model: "Activity" },
  })
  if (!itinerary) {
    const err = new Error("Trip not found")
    err.statusCode = 404
    throw err
  }
  if (!canAccessTripData(itinerary, userId)) {
    const err = new Error("Not authorized")
    err.statusCode = 403
    throw err
  }
  const bookings = await Booking.find({ userId, tripId }).lean()
  return { itinerary, bookings }
}

async function ensureAccessToken(integration) {
  if (!integration.connected) {
    const err = new Error(`${integration.provider} calendar not connected`)
    err.statusCode = 400
    throw err
  }

  const expiresSoon = integration.tokenExpiry && integration.tokenExpiry.getTime() < Date.now() + 60000
  if (!expiresSoon) return integration.getAccessToken()

  const refresh = integration.getRefreshToken()
  if (!refresh) return integration.getAccessToken()

  let tokens
  if (integration.provider === "google") {
    tokens = await refreshGoogleToken(refresh)
  } else {
    tokens = await refreshOutlookToken(refresh)
  }

  integration.setTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refresh,
    expiresIn: tokens.expires_in,
  })
  await integration.save()
  return integration.getAccessToken()
}

async function upsertProviderEvent(provider, accessToken, calendarId, ev, link) {
  if (provider === "google") {
    if (link?.externalEventId) {
      const updated = await updateGoogleEvent(accessToken, calendarId, link.externalEventId, ev)
      return updated.id
    }
    const created = await createGoogleEvent(accessToken, calendarId, ev)
    return created.id
  }

  if (link?.externalEventId) {
    const updated = await updateOutlookEvent(accessToken, link.externalEventId, ev)
    return updated.id
  }
  const created = await createOutlookEvent(accessToken, ev)
  return created.id
}

async function deleteProviderEvent(provider, accessToken, calendarId, externalEventId) {
  if (!externalEventId) return
  if (provider === "google") {
    await deleteGoogleEvent(accessToken, calendarId, externalEventId)
  } else {
    await deleteOutlookEvent(accessToken, externalEventId)
  }
}

export async function getIntegrations(userId) {
  const rows = await CalendarIntegration.find({ userId })
  const byProvider = Object.fromEntries(rows.map((r) => [r.provider, r.toSafeJSON()]))
  return {
    google: byProvider.google || { provider: "google", connected: false },
    outlook: byProvider.outlook || { provider: "outlook", connected: false },
  }
}

export async function disconnectProvider(userId, provider) {
  await CalendarIntegration.findOneAndUpdate(
    { userId, provider },
    {
      connected: false,
      accessTokenEnc: "",
      refreshTokenEnc: "",
      tokenExpiry: null,
      accountEmail: "",
    },
  )
  return { provider, connected: false }
}

export async function getTripEvents(userId, tripId) {
  const { itinerary, bookings } = await loadTrip(tripId, userId)
  const events = buildTripCalendarEvents(itinerary, bookings)
  const conflicts = detectConflicts(events)
  return { events, conflicts, trip: { id: String(itinerary._id), title: itinerary.title } }
}

export async function exportTripIcs(userId, tripId) {
  const { itinerary, bookings } = await loadTrip(tripId, userId)
  const events = buildTripCalendarEvents(itinerary, bookings)
  const ics = generateIcsCalendar(events, { name: `${itinerary.title} — TravelPlan` })
  return { ics, filename: `${itinerary.title.replace(/[^a-z0-9]+/gi, "-")}.ics`, eventCount: events.length }
}

export async function importIcsToTrip(userId, tripId, icsText) {
  const { itinerary } = await loadTrip(tripId, userId)
  const parsed = parseIcsCalendar(icsText)
  const imported = parsed.map((v) => mapIcsEventToInternal(v, itinerary._id, userId))

  for (const ev of imported) {
    await CalendarEventLink.findOneAndUpdate(
      { userId, tripId, provider: "ics", uid: ev.uid },
      {
        userId,
        tripId,
        provider: "ics",
        sourceType: "imported",
        sourceId: ev.sourceId,
        externalEventId: ev.uid,
        syncHash: ev.syncHash,
        uid: ev.uid,
      },
      { upsert: true },
    )
  }

  const all = buildTripCalendarEvents(itinerary, [])
  const merged = [...all, ...imported]
  return {
    imported: imported.length,
    conflicts: detectConflicts(merged),
    events: imported,
  }
}

export async function syncTripToProvider(userId, tripId, provider, { notify = true } = {}) {
  const integration = await CalendarIntegration.findOne({ userId, provider, connected: true })
  if (!integration) {
    const err = new Error(`${provider} calendar not connected`)
    err.statusCode = 400
    throw err
  }

  const { itinerary, bookings } = await loadTrip(tripId, userId)
  const events = buildTripCalendarEvents(itinerary, bookings)
  const conflicts = detectConflicts(events)
  const accessToken = await ensureAccessToken(integration)

  const existingLinks = await CalendarEventLink.find({ userId, tripId, provider })
  const linkByUid = new Map(existingLinks.map((l) => [l.uid, l]))
  const seenUids = new Set()

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const ev of events) {
    seenUids.add(ev.uid)
    const link = linkByUid.get(ev.uid)

    if (link && link.syncHash === ev.syncHash && link.externalEventId) {
      unchanged += 1
      continue
    }

    const externalId = await upsertProviderEvent(
      provider,
      accessToken,
      integration.calendarId || "primary",
      ev,
      link,
    )

    if (link) updated += 1
    else created += 1

    await CalendarEventLink.findOneAndUpdate(
      { userId, tripId, provider, uid: ev.uid },
      {
        userId,
        tripId,
        provider,
        sourceType: ev.sourceType,
        sourceId: ev.sourceId,
        externalEventId: externalId,
        syncHash: ev.syncHash,
        uid: ev.uid,
      },
      { upsert: true },
    )
  }

  for (const link of existingLinks) {
    if (!seenUids.has(link.uid) && link.externalEventId) {
      await deleteProviderEvent(provider, accessToken, integration.calendarId || "primary", link.externalEventId)
      await link.deleteOne()
    }
  }

  integration.lastSync = new Date()
  await integration.save()

  if (notify) {
    notifyCalendarSync(userId, tripId, provider, {
      tripTitle: itinerary.title,
      created,
      updated,
      unchanged,
    }).catch(() => {})
  }

  return {
    provider,
    tripId: String(tripId),
    created,
    updated,
    unchanged,
    deleted: existingLinks.length - seenUids.size,
    conflicts,
    lastSync: integration.lastSync,
  }
}

export async function syncTripToAllProviders(userId, tripId) {
  const integrations = await CalendarIntegration.find({ userId, connected: true, autoSync: true })
  const results = []
  for (const row of integrations) {
    try {
      const r = await syncTripToProvider(userId, tripId, row.provider, { notify: true })
      results.push({ ...r, success: true })
    } catch (err) {
      results.push({ provider: row.provider, success: false, error: err.message })
    }
  }
  return results
}

export async function syncTripCalendarsForUser(userId, tripId) {
  return syncTripToAllProviders(userId, tripId)
}

export async function getCalendarStatus(userId, tripId) {
  const integrations = await getIntegrations(userId)
  const links = await CalendarEventLink.find({ userId, tripId })
  const { events } = await getTripEvents(userId, tripId)
  const upcoming = events.filter((e) => new Date(e.start) >= new Date()).slice(0, 5)

  return {
    integrations,
    lastSync: {
      google: integrations.google?.lastSync,
      outlook: integrations.outlook?.lastSync,
    },
    syncedEventCount: links.length,
    upcoming,
  }
}
