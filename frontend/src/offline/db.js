import { openDB } from "idb"
import { DB_NAME, DB_VERSION, STORES } from "./constants.js"

let dbPromise = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.TRIPS)) {
          const trips = db.createObjectStore(STORES.TRIPS, { keyPath: "id" })
          trips.createIndex("downloadedAt", "downloadedAt")
        }
        if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
          const exp = db.createObjectStore(STORES.EXPENSES, { keyPath: "id" })
          exp.createIndex("tripId", "tripId")
          exp.createIndex("clientId", "clientId", { unique: false })
        }
        if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
          db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains(STORES.WEATHER)) {
          db.createObjectStore(STORES.WEATHER, { keyPath: "tripId" })
        }
        if (!db.objectStoreNames.contains(STORES.BLOGS)) {
          db.createObjectStore(STORES.BLOGS, { keyPath: "slug" })
        }
        if (!db.objectStoreNames.contains(STORES.MAPS)) {
          db.createObjectStore(STORES.MAPS, { keyPath: "tripId" })
        }
        if (!db.objectStoreNames.contains(STORES.NEARBY)) {
          db.createObjectStore(STORES.NEARBY, { keyPath: "key" })
        }
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const q = db.createObjectStore(STORES.QUEUE, { keyPath: "id" })
          q.createIndex("createdAt", "createdAt")
          q.createIndex("status", "status")
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: "key" })
        }
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: "key" })
        }
        if (!db.objectStoreNames.contains(STORES.SAVED_TRIPS)) {
          db.createObjectStore(STORES.SAVED_TRIPS, { keyPath: "id" })
        }
        if (!db.objectStoreNames.contains(STORES.AI_QUEUE)) {
          db.createObjectStore(STORES.AI_QUEUE, { keyPath: "id" })
        }
      },
    })
  }
  return dbPromise
}

export async function clearAllOfflineData() {
  const db = await getDb()
  const names = [...db.objectStoreNames]
  const tx = db.transaction(names, "readwrite")
  await Promise.all(names.map((n) => tx.objectStore(n).clear()))
  await tx.done
}
