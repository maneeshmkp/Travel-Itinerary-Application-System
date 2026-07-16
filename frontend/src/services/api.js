import axios from "axios"
import {
  clearAuthStorage,
  getAuthToken,
  getOrCreateDeviceId,
  getRefreshToken,
  persistAuthSession,
  setAuthToken,
  setRefreshToken,
} from "../utils/authStorage"
import { resolveApiBaseUrl } from "../apiBaseUrl.helper.js"

/** Production-safe base URL — never localhost when VITE_API_URL is missing in prod builds. */
const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL, {
  isDev: import.meta.env.DEV,
})

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: true,
})

let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken, deviceId: getOrCreateDeviceId() },
        { withCredentials: true, timeout: 15000 },
      )
      .then((res) => {
        const data = res.data
        const access = data.accessToken || data.token
        if (!data?.success || !access) return null
        persistAuthSession(access, data.user ?? undefined, data.refreshToken)
        return access
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)

    const url = String(config.url || "")
    if (url.includes("/ai/itinerary")) {
      config.timeout = Math.max(config.timeout ?? 0, 180000)
    } else if (url.includes("/ai/")) {
      config.timeout = Math.max(config.timeout ?? 0, 120000)
    } else if (url.includes("/recommendations/nearby")) {
      config.timeout = Math.max(config.timeout ?? 0, 45000)
    } else if (url.includes("/hotels") || url.includes("/flights")) {
      config.timeout = Math.max(config.timeout ?? 0, 45000)
    } else if (url.includes("/chat")) {
      config.timeout = Math.max(config.timeout ?? 0, 120000)
    }

    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const deviceId = getOrCreateDeviceId()
    if (deviceId) config.headers["X-Device-Id"] = deviceId

    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type")
      } else if (config.headers) {
        delete config.headers["Content-Type"]
      }
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — refresh on expiry once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error("API Error:", error.response?.data || error.message)

    if (error.code === "ECONNABORTED") {
      const isAi = String(error.config?.url || "").includes("/ai/")
      error.message = isAi
        ? "AI generation is taking longer than expected. Please try again — a starter itinerary may still be returned if providers are busy."
        : "Request timed out. Please check your connection and try again."
    } else if (error.response?.status === 404) {
      error.message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "The requested resource was not found."
    } else if ([400, 429, 502, 503, 504].includes(error.response?.status)) {
      const m = error.response?.data?.message
      if (typeof m === "string" && m.length > 0 && m.length < 800 && !m.trimStart().startsWith("{")) {
        error.message = m
      }
    } else if (error.response?.status === 401) {
      const url = String(error.config?.url || "")
      const msg = error.response?.data?.message
      error.message =
        typeof msg === "string" && msg.length > 0 ? msg : "Session expired. Please sign in again."

      const cfg = error.config || {}
      const skipRefresh =
        cfg._retry ||
        url.includes("/auth/login") ||
        url.includes("/auth/signup") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/forgot")

      if (!skipRefresh && getRefreshToken()) {
        cfg._retry = true
        const access = await refreshAccessToken()
        if (access) {
          cfg.headers = cfg.headers || {}
          cfg.headers.Authorization = `Bearer ${access}`
          return api.request(cfg)
        }
      }

      if (!url.includes("/auth/login") && !url.includes("/auth/signup") && !url.includes("/auth/me")) {
        clearAuthStorage()
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          const from = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.assign(`/login?session=expired&from=${from}`)
        }
      }
    } else if (error.response?.status === 500) {
      error.message = "Server error. Please try again later."
    } else if (!error.response) {
      error.message = "Network error. Please check your connection."
    }

    return Promise.reject(error)
  },
)

// Itinerary API calls
export const itineraryAPI = {
  // Get all itineraries with optional filters
  getAll: (params = {}) => api.get("/itineraries", { params }),

  // Autocomplete (min ~2 chars recommended)
  getSuggestions: (search) =>
    api.get("/itineraries/suggestions", { params: { search } }),

  // Get single itinerary by ID
  getById: (id) => api.get(`/itineraries/${id}`),

  // Create new itinerary
  create: (data) => api.post("/itineraries", data),

  // Update itinerary
  update: (id, data) => api.put(`/itineraries/${id}`, data),

  // Delete itinerary
  delete: (id) => api.delete(`/itineraries/${id}`),

  // Saved itineraries (auth required)
  saveForUser: (id) => api.post(`/itineraries/${id}/save`),
  unsaveForUser: (id) => api.delete(`/itineraries/${id}/save`),
  checkSaved: (id) => api.get(`/itineraries/${id}/saved`),
  /** List saved trips (auth). Uses GET /api/itineraries/saved */
  getMySaved: () => api.get("/itineraries/saved"),

  /** Refresh cover image from destination/activities (server-side Unsplash or curated fallback) */
  refreshCoverImage: (id) => api.post(`/itineraries/${id}/refresh-cover-image`),

  /** Download itinerary PDF (public) */
  downloadPdf: (id) =>
    api.get(`/itineraries/${id}/pdf`, {
      responseType: "blob",
      timeout: 60000,
    }),

  /** Reorder activities to minimize travel distance (requires coordinates) */
  optimize: (id) => api.post(`/itineraries/${id}/optimize`),

  /** Skip or restore an activity and reflow the day schedule */
  adjustActivity: (id, activityId, { skipped = true } = {}) =>
    api.post(`/itineraries/${id}/activities/${activityId}/skip`, { skipped }),

  /** Enable collaborative editing (owner) */
  enableCollaboration: (id) => api.post(`/itineraries/${id}/collaborate/enable`),

  /** Join as collaborator via invite token */
  joinCollaboration: (id, token) =>
    api.post(`/itineraries/${id}/collaborate/join`, { token }),

  /** Expense tracker — planned vs actual spending */
  getExpenses: (id) => api.get(`/itineraries/${id}/expenses`),
  addExpense: (id, data) => api.post(`/itineraries/${id}/expenses`, data),
  updateExpense: (id, expenseId, data) => api.put(`/itineraries/${id}/expenses/${expenseId}`, data),
  duplicateExpense: (id, expenseId) => api.post(`/itineraries/${id}/expenses/${expenseId}/duplicate`),
  deleteExpense: (id, expenseId) => api.delete(`/itineraries/${id}/expenses/${expenseId}`),
  exportExpensesCsv: (id) =>
    api.get(`/itineraries/${id}/expenses/export/csv`, { responseType: "blob" }),
  exportExpensesPdf: (id) =>
    api.get(`/itineraries/${id}/expenses/export/pdf`, { responseType: "blob" }),
}

/** Live availability (SerpAPI / Google Travel) */
export const availabilityAPI = {
  getHotels: (params = {}) => api.get("/hotels", { params }),
  getFlights: (params = {}) => api.get("/flights", { params }),
  getTrains: (params = {}) => api.get("/trains", { params }),
  getBuses: (params = {}) => api.get("/buses", { params }),
  getActivities: (params = {}) => api.get("/activities", { params }),
}

/** Booking redirect analytics */
export const analyticsAPI = {
  logBookingClick: (payload) => api.post("/analytics/booking-click", payload),
}

/** Blog & reviews */
export const blogAPI = {
  getAll: (params = {}) => api.get("/blogs", { params }),
  getBySlug: (slug) => api.get(`/blogs/${slug}`),
}

export const reviewAPI = {
  getForItinerary: (itineraryId) => api.get(`/itineraries/${itineraryId}/reviews`),
  add: (itineraryId, data) => api.post(`/itineraries/${itineraryId}/reviews`, data),
}

/** AI endpoints (require auth; longer timeout for model latency) */
const aiTimeout = { timeout: 120000 }
const aiGenerateTimeout = { timeout: 180000 }
export const aiAPI = {
  enrichDescriptions: (payload) => api.post("/ai/enrich-descriptions", payload, aiTimeout),
  suggestDay: (payload) => api.post("/ai/suggest-day", payload, aiTimeout),
  suggestHighlights: (payload) => api.post("/ai/suggest-highlights", payload, aiTimeout),
  tripSummary: (payload) => api.post("/ai/trip-summary", payload, aiTimeout),
  generateItinerary: (payload) => api.post("/ai/itinerary", payload, aiGenerateTimeout),
}

/** Conversational travel copilot (tool-calling, streaming, sessions) */
export const chatAPI = {
  send: (payload) => api.post("/chat", payload, aiTimeout),
}

// Recommendation API calls
export const recommendationAPI = {
  getRecommendations: (params = {}) => api.get("/recommendations", { params }),

  /** Content-based + collaborative scoring (uses auth token when logged in) */
  getAdvanced: (params = {}) => api.get("/recommendations/advanced", { params }),

  // Get available destinations
  getDestinations: () => api.get("/recommendations/destinations"),

  // Get similar itineraries
  getSimilar: (id) => api.get(`/recommendations/similar/${id}`),

  /** Nearby places from user coordinates */
  getNearby: (params = {}) => api.get("/recommendations/nearby", { params }),

  getClientLocation: () => api.get("/recommendations/nearby/client-location"),

  getNearbyCategories: () => api.get("/recommendations/nearby/categories"),
}

// Weather API (OpenWeather via backend)
export const weatherAPI = {
  /** GET /weather?destination=&date=YYYY-MM-DD */
  getWeather: (params) => api.get("/weather", { params }),

  /** GET /weather/forecast?destination=&days=&startDate= */
  getForecast: (params) => api.get("/weather/forecast", { params }),

  /** GET /weather/places/:tripId?startDate=YYYY-MM-DD */
  getPlaceWeather: (tripId, startDate) =>
    api.get(`/weather/places/${tripId}`, { params: startDate ? { startDate } : undefined }),
}

// Authentication API calls
export const authAPI = {
  signup: (data) => api.post("/auth/signup", data),
  login: (data) => api.post("/auth/login", data),
  refresh: (data) => api.post("/auth/refresh", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
  getCurrentUser: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  logoutAll: () => api.post("/auth/logout-all"),
  listSessions: () => api.get("/auth/sessions"),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  setToken: (token) => {
    setAuthToken(token)
  },
  getToken: () => getAuthToken(),
  isAuthenticated: () => !!getAuthToken(),
}

/** Notifications */
export const notificationAPI = {
  getAll: (params = {}) => api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.post(`/notifications/read/${id}`),
  markAllRead: () => api.post("/notifications/read-all"),
  markReadBatch: (ids) => api.patch("/notifications/read", { ids }),
  delete: (id) => api.delete(`/notifications/${id}`),
  archive: (id) => api.patch(`/notifications/archive/${id}`),
  getSettings: () => api.get("/notifications/settings"),
  updateSettings: (data) => api.put("/notifications/settings", data),
  seedSamples: () => api.post("/notifications/seed"),
  runScheduler: () => api.post("/notifications/scheduler/run"),
}

/** Booking management */
export const bookingAPI = {
  list: (params = {}) => api.get("/bookings", { params }),
  search: (params = {}) => api.get("/bookings/search", { params }),
  upcoming: (params = {}) => api.get("/bookings/upcoming", { params }),
  dashboard: (params = {}) => api.get("/bookings/dashboard", { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post("/bookings", data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  convertExpense: (id) => api.post(`/bookings/${id}/convert-expense`),
  tripList: (tripId, params = {}) => api.get(`/trips/${tripId}/bookings`, { params }),
  tripTimeline: (tripId) => api.get(`/trips/${tripId}/bookings/timeline`),
  tripMapMarkers: (tripId) => api.get(`/trips/${tripId}/bookings/map-markers`),
  aiContext: (params = {}) => api.get("/bookings/ai-context", { params }),
  aiQuery: (data) => api.post("/ai/booking-query", data),
}

/** Travel document vault */
export const documentAPI = {
  list: (params = {}) => api.get("/documents", { params }),
  search: (params = {}) => api.get("/documents/search", { params }),
  getById: (id) => api.get(`/documents/${id}`),
  create: (formData) =>
    api.post("/documents", formData, {
      timeout: 120000,
    }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  favorite: (id) => api.post(`/documents/favorite/${id}`),
  download: (id) => api.get(`/documents/${id}/download`),
  tripList: (tripId, params = {}) => api.get(`/trips/${tripId}/documents`, { params }),
  timeline: () => api.get("/documents/timeline"),
  stats: () => api.get("/documents/stats"),
  missing: (tripId) => api.get("/documents/missing", { params: { tripId } }),
  aiQuery: (data) => api.post("/ai/document-query", data),
}

/** AI packing assistant */
export const packingAPI = {
  generate: (data) => api.post("/packing/generate", data, aiTimeout),
  regenerate: (data) => api.post("/packing/regenerate", data, aiTimeout),
  getByTrip: (tripId) => api.get(`/packing/${tripId}`),
  updateItem: (id, data) => api.put(`/packing/item/${id}`, data),
  addCustom: (data) => api.post("/packing/custom", data),
  deleteItem: (id, tripId) => api.delete(`/packing/item/${id}`, { params: { tripId } }),
  search: (tripId, params = {}) => api.get(`/packing/${tripId}/search`, { params }),
  exportPdf: (tripId) =>
    api.get(`/packing/${tripId}/export/pdf`, {
      responseType: "blob",
      timeout: 60000,
    }),
  exportCsv: (tripId) =>
    api.get(`/packing/${tripId}/export/csv`, {
      responseType: "blob",
      timeout: 60000,
    }),
}

/** AI travel risk detection */
export const riskAPI = {
  analyze: (data) => api.post("/risk/analyze", data, aiTimeout),
  getByTrip: (tripId) => api.get(`/risk/${tripId}`),
  replan: (data) => api.post("/risk/replan", data, aiTimeout),
  resolve: (id, data) => api.post(`/risk/resolve/${id}`, data),
  aiQuery: (data) => api.post("/ai/risk-query", data, aiTimeout),
}

/** AI budget optimizer */
export const budgetAPI = {
  analyze: (data) => api.post("/budget/analyze", data, aiTimeout),
  getByTrip: (tripId) => api.get(`/budget/${tripId}`),
  apply: (data) => api.post("/budget/apply", data),
  simulate: (data) => api.post("/budget/simulate", data),
  aiQuery: (data) => api.post("/ai/budget-query", data, aiTimeout),
}

/** Personal travel analytics */
export const travelAnalyticsAPI = {
  getDashboard: () => api.get("/analytics/dashboard"),
  getYear: (year) => api.get(`/analytics/year/${year}`),
  getMonth: (month) => api.get(`/analytics/month/${month}`),
  getTravelScore: () => api.get("/analytics/travel-score"),
  recalculate: (data = {}) => api.post("/analytics/recalculate", data, aiTimeout),
  exportCsv: (params = {}) =>
    api.get("/analytics/export/csv", { params, responseType: "blob", timeout: 60000 }),
  exportPdf: (params = {}) =>
    api.get("/analytics/export/pdf", { params, responseType: "blob", timeout: 60000 }),
}

/** Live flight tracking */
export const flightTrackingAPI = {
  getStatus: (flightNumber, params = {}) => api.get(`/flights/status/${encodeURIComponent(flightNumber)}`, { params }),
  track: (data) => api.post("/flights/track", data),
  stopTracking: (id) => api.delete(`/flights/track/${id}`),
  getTripFlights: (tripId) => api.get(`/flights/trip/${tripId}`),
  getHistory: (params = {}) => api.get("/flights/history", { params }),
  refresh: (id) => api.post(`/flights/refresh/${id}`),
  aiQuery: (data) => api.post("/ai/flight-query", data, aiTimeout),
}

/** Calendar integration */
export const calendarAPI = {
  getStatus: () => api.get("/calendar/status"),
  getTripStatus: (tripId) => api.get(`/calendar/trip/${tripId}/status`),
  getEvents: (tripId) => api.get("/calendar/events", { params: { tripId } }),
  googleConnect: () => api.post("/calendar/google/connect"),
  googleDisconnect: () => api.post("/calendar/google/disconnect"),
  outlookConnect: () => api.post("/calendar/outlook/connect"),
  outlookDisconnect: () => api.post("/calendar/outlook/disconnect"),
  sync: (data) => api.post("/calendar/sync", data),
  export: (tripId) => api.post("/calendar/export", { tripId }),
  import: (tripId, ics) => api.post("/calendar/import", { tripId, ics }),
}

// Health check
export const healthCheck = () => api.get("/health")

/** Admin portal (RBAC-protected) */
export const adminAPI = {
  dashboard: () => api.get("/admin/dashboard"),
  listUsers: (params = {}) => api.get("/admin/users", { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  changeRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  suspendUser: (id) => api.post(`/admin/users/${id}/suspend`),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  resetPassword: (id, data = {}) => api.post(`/admin/users/${id}/reset-password`, data),
  listTrips: (params = {}) => api.get("/admin/trips", { params }),
  listBookings: (params = {}) => api.get("/admin/bookings", { params }),
  listDocuments: (params = {}) => api.get("/admin/documents", { params }),
  analytics: () => api.get("/admin/analytics"),
  notificationsOverview: () => api.get("/admin/notifications/overview"),
  roles: () => api.get("/admin/roles"),
  audit: (params = {}) => api.get("/admin/audit", { params }),
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (data) => api.put("/admin/settings", data),
  apiKeys: () => api.get("/admin/api-keys"),
  events: () => api.get("/admin/events"),
  queues: () => api.get("/admin/queues"),
  retryQueueJob: (queueName, jobId) => api.post(`/admin/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}/retry`),
  requeueDeadLetter: (jobId) => api.post(`/admin/queues/dead-letter/${encodeURIComponent(jobId)}/requeue`),
  listTenants: (params = {}) => api.get("/admin/tenants", { params }),
  createTenant: (data) => api.post("/admin/tenants", data),
  getTenant: (id) => api.get(`/admin/tenants/${id}`),
  updateTenant: (id, data) => api.patch(`/admin/tenants/${id}`, data),
  tenantUsage: (id) => api.get(`/admin/tenants/${id}/usage`),
  tenantsMetrics: () => api.get("/admin/tenants/metrics"),
  tenantPlans: () => api.get("/admin/tenants/plans"),
  myUsage: () => api.get("/admin/usage/me"),
  security: () => api.get("/admin/security"),
  securitySessions: (params = {}) => api.get("/admin/security/sessions", { params }),
}

/** Admin monitoring (requires admin:monitoring) */
export const monitoringAPI = {
  overview: () => api.get("/monitoring/overview"),
  metrics: () => api.get("/monitoring/metrics"),
  alerts: () => api.get("/monitoring/alerts"),
  services: () => api.get("/monitoring/services"),
}

export default api
