import CalendarIntegration from "../../models/CalendarIntegration.js"
import { createOAuthState } from "../../utils/tokenEncryption.js"
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleEmail,
  isGoogleCalendarConfigured,
} from "../../services/googleCalendar/googleCalendarService.js"
import {
  getOutlookAuthUrl,
  exchangeOutlookCode,
  fetchOutlookEmail,
  isOutlookCalendarConfigured,
} from "../../services/outlookCalendar/outlookCalendarService.js"
import {
  getIntegrations,
  disconnectProvider,
  getTripEvents,
  exportTripIcs,
  importIcsToTrip,
  syncTripToProvider,
  syncTripToAllProviders,
  getCalendarStatus,
} from "../../services/calendar/calendarSyncService.js"

const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:3000"

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || "Server error" })
}

export const getStatus = async (req, res) => {
  try {
    const data = await getIntegrations(req.user._id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const googleConnect = async (req, res) => {
  try {
    if (!isGoogleCalendarConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Google Calendar OAuth not configured. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET.",
      })
    }
    const state = createOAuthState(req.user._id, "google")
    res.json({ success: true, data: { authUrl: getGoogleAuthUrl(state) } })
  } catch (err) {
    handleError(res, err)
  }
}

export const googleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query
    if (error) return res.redirect(`${frontendUrl()}/calendar-settings?error=${encodeURIComponent(error)}`)
    const { parseOAuthState } = await import("../../utils/tokenEncryption.js")
    const parsed = parseOAuthState(state)
    if (!parsed?.userId) return res.redirect(`${frontendUrl()}/calendar-settings?error=invalid_state`)

    const tokens = await exchangeGoogleCode(code)
    const email = await fetchGoogleEmail(tokens.access_token)

    let integration = await CalendarIntegration.findOne({ userId: parsed.userId, provider: "google" })
    if (!integration) {
      integration = new CalendarIntegration({ userId: parsed.userId, provider: "google" })
    }
    integration.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    })
    integration.accountEmail = email
    integration.connected = true
    await integration.save()

    res.redirect(`${frontendUrl()}/calendar-settings?connected=google`)
  } catch (err) {
    res.redirect(`${frontendUrl()}/calendar-settings?error=${encodeURIComponent(err.message)}`)
  }
}

export const googleDisconnect = async (req, res) => {
  try {
    const data = await disconnectProvider(req.user._id, "google")
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const outlookConnect = async (req, res) => {
  try {
    if (!isOutlookCalendarConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.",
      })
    }
    const state = createOAuthState(req.user._id, "outlook")
    res.json({ success: true, data: { authUrl: getOutlookAuthUrl(state) } })
  } catch (err) {
    handleError(res, err)
  }
}

export const outlookCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query
    if (error) return res.redirect(`${frontendUrl()}/calendar-settings?error=${encodeURIComponent(error)}`)
    const { parseOAuthState } = await import("../../utils/tokenEncryption.js")
    const parsed = parseOAuthState(state)
    if (!parsed?.userId) return res.redirect(`${frontendUrl()}/calendar-settings?error=invalid_state`)

    const tokens = await exchangeOutlookCode(code)
    const email = await fetchOutlookEmail(tokens.access_token)

    let integration = await CalendarIntegration.findOne({ userId: parsed.userId, provider: "outlook" })
    if (!integration) {
      integration = new CalendarIntegration({ userId: parsed.userId, provider: "outlook" })
    }
    integration.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    })
    integration.accountEmail = email
    integration.connected = true
    await integration.save()

    res.redirect(`${frontendUrl()}/calendar-settings?connected=outlook`)
  } catch (err) {
    res.redirect(`${frontendUrl()}/calendar-settings?error=${encodeURIComponent(err.message)}`)
  }
}

export const outlookDisconnect = async (req, res) => {
  try {
    const data = await disconnectProvider(req.user._id, "outlook")
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const listEvents = async (req, res) => {
  try {
    const tripId = req.query.tripId
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await getTripEvents(req.user._id, tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const syncCalendar = async (req, res) => {
  try {
    const { tripId, provider } = req.body
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })

    const data = provider
      ? await syncTripToProvider(req.user._id, tripId, provider)
      : await syncTripToAllProviders(req.user._id, tripId)

    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const exportCalendar = async (req, res) => {
  try {
    const { tripId } = req.body
    if (!tripId) return res.status(400).json({ success: false, message: "tripId is required" })
    const data = await exportTripIcs(req.user._id, tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const importCalendar = async (req, res) => {
  try {
    const { tripId, ics } = req.body
    if (!tripId || !ics) {
      return res.status(400).json({ success: false, message: "tripId and ics are required" })
    }
    const data = await importIcsToTrip(req.user._id, tripId, ics)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const tripCalendarStatus = async (req, res) => {
  try {
    const data = await getCalendarStatus(req.user._id, req.params.tripId || req.query.tripId)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}
