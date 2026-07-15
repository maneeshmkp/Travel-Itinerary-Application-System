export const DB_NAME = "travelplan-offline"
export const DB_VERSION = 1

export const STORES = {
  TRIPS: "trips",
  EXPENSES: "expenses",
  NOTIFICATIONS: "notifications",
  WEATHER: "weather",
  BLOGS: "blogs",
  MAPS: "maps",
  NEARBY: "nearby",
  QUEUE: "queue",
  SETTINGS: "settings",
  META: "meta",
  SAVED_TRIPS: "savedTrips",
  AI_QUEUE: "aiQueue",
}

export const QUEUE_ACTIONS = {
  EXPENSE_CREATE: "expense.create",
  EXPENSE_UPDATE: "expense.update",
  EXPENSE_DELETE: "expense.delete",
  ITINERARY_CREATE: "itinerary.create",
  ITINERARY_UPDATE: "itinerary.update",
  TRIP_SAVE: "trip.save",
  REVIEW_CREATE: "review.create",
  CHAT_MESSAGE: "chat.message",
  AI_REQUEST: "ai.request",
}

export const SYNC_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  SYNCING: "syncing",
  QUEUED: "queued",
  ERROR: "error",
}

export const DEFAULT_OFFLINE_SETTINGS = {
  autoDownloadTrips: false,
  autoSync: true,
  downloadImages: true,
  downloadMaps: true,
  backgroundSync: true,
}

export const CACHE_TTL_MS = {
  weather: 24 * 60 * 60 * 1000,
  blogs: 7 * 24 * 60 * 60 * 1000,
  api: 60 * 60 * 1000,
}
