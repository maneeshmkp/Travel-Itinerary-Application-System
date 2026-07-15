/* eslint-disable no-restricted-globals */
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"
import { registerRoute, NavigationRoute } from "workbox-routing"
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies"
import { ExpirationPlugin } from "workbox-expiration"
import { BackgroundSyncPlugin } from "workbox-background-sync"
import { CacheableResponsePlugin } from "workbox-cacheable-response"

const CACHE_VERSION = "travelplan-v1"

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const bgSyncPlugin = new BackgroundSyncPlugin("travelplan-api-queue", {
  maxRetentionTime: 24 * 60,
})

registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  new CacheFirst({
    cacheName: `${CACHE_VERSION}-assets`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/blogs"),
  new StaleWhileRevalidate({
    cacheName: `${CACHE_VERSION}-blogs`,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
)

registerRoute(
  ({ url }) => url.pathname.includes("/recommendations/nearby"),
  new StaleWhileRevalidate({
    cacheName: `${CACHE_VERSION}-nearby`,
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 24 * 60 * 60 })],
  }),
)

registerRoute(
  ({ url, request }) => {
    if (!url.pathname.startsWith("/api/")) return false
    // Authenticated API calls must bypass the service worker (preserves Authorization header)
    if (request.headers.get("authorization")) return false
    return true
  },
  new NetworkFirst({
    cacheName: `${CACHE_VERSION}-api`,
    networkTimeoutSeconds: 8,
    plugins: [
      bgSyncPlugin,
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
)

const navigationHandler = async ({ event }) => {
  try {
    return await fetch(event.request)
  } catch {
    const cache = await caches.open(`${CACHE_VERSION}-pages`)
    return (await cache.match("/offline.html")) || (await cache.match("/index.html"))
  }
}

registerRoute(new NavigationRoute(navigationHandler))

self.addEventListener("sync", (event) => {
  if (event.tag === "travelplan-sync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SYNC_REQUEST" }))
      }),
    )
  }
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})
