import {
  enqueueMutation,
} from "./offlineQueue.js"
import {
  refreshQueueCount,
  isOffline,
  isMutationMethod,
} from "./syncManager.js"
import {
  cacheApiResponse,
  getCachedApiResponse,
  cacheExpenseReport,
  getCachedExpenseReport,
  putLocalExpense,
  cacheTrip,
  getCachedTrip,
  cacheNotifications,
  getCachedNotifications,
  cacheBlog,
  getCachedBlog,
  cacheSavedTrips,
  getCachedSavedTrips,
} from "./cacheService.js"
import { QUEUE_ACTIONS } from "./constants.js"

const MUTATION_ROUTES = [
  { pattern: /\/itineraries\/[^/]+\/expenses$/, method: "POST", action: QUEUE_ACTIONS.EXPENSE_CREATE },
  { pattern: /\/itineraries\/[^/]+\/expenses\/[^/]+\/duplicate$/, method: "POST", action: QUEUE_ACTIONS.EXPENSE_CREATE },
  { pattern: /\/itineraries\/[^/]+\/expenses\/[^/]+$/, method: "PUT", action: QUEUE_ACTIONS.EXPENSE_UPDATE },
  { pattern: /\/itineraries\/[^/]+\/expenses\/[^/]+$/, method: "DELETE", action: QUEUE_ACTIONS.EXPENSE_DELETE },
  { pattern: /\/itineraries$/, method: "POST", action: QUEUE_ACTIONS.ITINERARY_CREATE },
  { pattern: /\/itineraries\/[^/]+$/, method: "PUT", action: QUEUE_ACTIONS.ITINERARY_UPDATE },
  { pattern: /\/itineraries\/[^/]+\/save$/, method: "POST", action: QUEUE_ACTIONS.TRIP_SAVE },
  { pattern: /\/itineraries\/[^/]+\/reviews$/, method: "POST", action: QUEUE_ACTIONS.REVIEW_CREATE },
  { pattern: /\/chat/, method: "POST", action: QUEUE_ACTIONS.CHAT_MESSAGE },
  { pattern: /\/ai\//, method: "POST", action: QUEUE_ACTIONS.AI_REQUEST },
]

function matchMutation(config) {
  const url = String(config.url || "")
  const method = String(config.method || "GET").toUpperCase()
  return MUTATION_ROUTES.find((r) => r.method === method && r.pattern.test(url))
}

function cacheKeyFromConfig(config) {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`
}

async function tryReadCache(config) {
  const url = String(config.url || "")
  const method = String(config.method || "GET").toUpperCase()
  if (method !== "GET") return null

  const tripMatch = url.match(/\/itineraries\/([^/]+)$/)
  if (tripMatch && !url.includes("/expenses")) {
    const cached = await getCachedTrip(tripMatch[1])
    if (cached?.data) return { data: { success: true, data: cached.data, offline: true } }
  }

  const expenseMatch = url.match(/\/itineraries\/([^/]+)\/expenses$/)
  if (expenseMatch) {
    const report = await getCachedExpenseReport(expenseMatch[1])
    if (report) return { data: { success: true, data: report, offline: true } }
  }

  if (url.includes("/notifications/unread-count")) {
    const cached = await getCachedApiResponse(cacheKeyFromConfig(config))
    if (cached) return { data: cached, offline: true }
    const items = await getCachedNotifications()
    const count = items.filter((n) => n.status === "UNREAD").length
    return { data: { success: true, data: { count }, offline: true } }
  }

  if (url.includes("/notifications")) {
    const items = await getCachedNotifications()
    if (items.length) {
      return {
        data: {
          success: true,
          data: {
            items,
            grouped: {
              unread: items.filter((n) => n.status === "UNREAD"),
              today: [],
              earlier: items,
              archived: [],
            },
            pagination: { page: 1, pages: 1, total: items.length },
            unreadCount: items.filter((n) => n.status === "UNREAD").length,
          },
          offline: true,
        },
      }
    }
  }

  if (url.includes("/itineraries/saved")) {
    const trips = await getCachedSavedTrips()
    if (trips.length) return { data: { success: true, data: trips, offline: true } }
  }

  const blogMatch = url.match(/\/blogs\/([^/]+)$/)
  if (blogMatch) {
    const cached = await getCachedBlog(blogMatch[1])
    if (cached?.article) return { data: { success: true, data: cached.article, offline: true } }
  }

  const generic = await getCachedApiResponse(cacheKeyFromConfig(config))
  if (generic) return { data: generic, offline: true }

  return null
}

function buildOptimisticExpenseResponse(config, clientId) {
  const body = config.data || {}
  const expense = {
    id: clientId,
    clientId,
    pending: true,
    ...body,
    amount: Number(body.amount),
    spentAt: body.spentAt || new Date().toISOString(),
  }
  return { expense, report: null, offline: true, queued: true }
}

function offlineResponse(config, data, status = 202) {
  return {
    data,
    status,
    statusText: status === 200 ? "OK (offline cache)" : "Accepted (offline queue)",
    headers: {},
    config,
  }
}

export function attachOfflineInterceptors(axiosInstance) {
  axiosInstance.interceptors.request.use(async (config) => {
    if (isOffline() && !isMutationMethod(config.method)) {
      const cached = await tryReadCache(config)
      if (cached) {
        config.adapter = () => Promise.resolve(offlineResponse(config, cached.data, 200))
        return config
      }
    }

    if (!isOffline() || !isMutationMethod(config.method)) return config

    const match = matchMutation(config)
    if (!match) return config

    const clientId = crypto.randomUUID?.() || `local-${Date.now()}`
    const item = await enqueueMutation({
      action: match.action,
      method: config.method,
      url: config.url,
      body: config.data,
      entityType: match.action.split(".")[0],
      clientId,
      optimistic: config.data,
    })

    config.adapter = async () => {
      await refreshQueueCount()

      if (match.action === QUEUE_ACTIONS.EXPENSE_CREATE) {
        const tripId = config.url.match(/itineraries\/([^/]+)/)?.[1]
        const opt = buildOptimisticExpenseResponse(config, clientId)
        if (tripId) {
          await putLocalExpense(tripId, opt.expense)
          const report = await getCachedExpenseReport(tripId)
          if (report) {
            report.expenses = [opt.expense, ...(report.expenses || [])]
            await cacheExpenseReport(tripId, report)
            opt.report = report
          }
        }
        return offlineResponse(config, {
          success: true,
          data: { expense: opt.expense, report: opt.report },
          offline: true,
          queued: true,
          queueId: item.id,
        })
      }

      if (match.action === QUEUE_ACTIONS.AI_REQUEST) {
        return offlineResponse(config, {
          success: true,
          offline: true,
          queued: true,
          message: "Will generate when internet returns.",
        })
      }

      return offlineResponse(config, { success: true, offline: true, queued: true, queueId: item.id })
    }

    return config
  })

  axiosInstance.interceptors.response.use(
    async (response) => {
      const config = response.config
      const url = String(config?.url || "")

      if (url.match(/\/itineraries\/([^/]+)$/) && config.method === "get" && response.data?.data) {
        const id = response.data.data._id || response.data.data.id
        if (id) await cacheTrip(id, response.data.data)
      }
      if (url.includes("/expenses") && response.data?.data) {
        const tripId = url.match(/itineraries\/([^/]+)/)?.[1]
        const report = response.data.data.report || response.data.data
        if (tripId && report?.expenses) await cacheExpenseReport(tripId, report)
      }
      if (url.includes("/notifications") && response.data?.data?.items) {
        await cacheNotifications(response.data.data.items)
      }
      if (url.includes("/blogs/") && response.data?.data) {
        const slug = url.split("/blogs/")[1]?.split("?")[0]
        if (slug) await cacheBlog(slug, response.data.data)
      }
      if (url.includes("/itineraries/saved") && Array.isArray(response.data?.data)) {
        await cacheSavedTrips(response.data.data)
      }

      await cacheApiResponse(cacheKeyFromConfig(config), response.data)
      return response
    },
    async (error) => {
      if (!error.config) throw error

      const unreachable =
        !error.response ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNREFUSED" ||
        String(error.message || "").includes("Network Error") ||
        String(error.message || "").includes("ECONNREFUSED")

      if (!unreachable) throw error

      const cached = await tryReadCache(error.config)
      if (cached) {
        return offlineResponse(error.config, cached.data, 200)
      }
      throw error
    },
  )
}
