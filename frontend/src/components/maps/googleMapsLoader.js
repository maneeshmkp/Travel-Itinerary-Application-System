import { Loader } from "@googlemaps/js-api-loader"

/** @type {Promise<void> | null} */
let loadPromise = null

/** @type {Set<() => void>} */
const authFailureHandlers = new Set()

const PLACEHOLDER_KEY_PATTERN = /^(your[_-]?|xxx|test|placeholder|changeme)/i

export function isUsableGoogleMapsApiKey(apiKey) {
  const key = String(apiKey || "").trim()
  if (!key) return false
  if (PLACEHOLDER_KEY_PATTERN.test(key)) return false
  return /^AIza[\w-]{20,}$/.test(key)
}

function notifyAuthFailure() {
  for (const handler of authFailureHandlers) {
    try {
      handler()
    } catch (err) {
      console.error("[googleMapsLoader] auth failure handler error:", err)
    }
  }
}

function ensureAuthFailureHook() {
  if (typeof window === "undefined") return
  const existing = window.gm_authFailure
  window.gm_authFailure = () => {
    if (typeof existing === "function") existing()
    notifyAuthFailure()
  }
}

/**
 * Register a callback when Google rejects the API key (billing, referrer, disabled API).
 * @param {() => void} handler
 * @returns {() => void} unsubscribe
 */
export function onGoogleMapsAuthFailure(handler) {
  authFailureHandlers.add(handler)
  return () => authFailureHandlers.delete(handler)
}

/**
 * Google injects an error panel without always throwing — probe the map container.
 * @param {HTMLElement | null} container
 * @param {() => void} onFail
 * @param {{ delayMs?: number }} [options]
 * @returns {() => void}
 */
export function probeGoogleMapRenderError(container, onFail, options = {}) {
  const delayMs = options.delayMs ?? 2200
  const timer = window.setTimeout(() => {
    if (!container) return
    const text = container.textContent || ""
    const hasErrorPanel =
      Boolean(container.querySelector(".gm-err-container")) ||
      text.includes("didn't load Google Maps correctly") ||
      text.includes("Google Maps JavaScript API error")

    if (hasErrorPanel) onFail()
  }, delayMs)

  return () => window.clearTimeout(timer)
}

/**
 * Loads the Maps JavaScript API via the official bootstrap (callback + importLibrary).
 */
export function loadGoogleMapsScript(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"))
  }

  if (!isUsableGoogleMapsApiKey(apiKey)) {
    return Promise.reject(new Error("Invalid or missing Google Maps API key"))
  }

  ensureAuthFailureHook()

  if (window.google?.maps?.importLibrary) {
    return Promise.all([
      window.google.maps.importLibrary("maps"),
      window.google.maps.importLibrary("marker"),
    ]).then(() => undefined)
  }

  if (!loadPromise) {
    document.querySelectorAll('script[data-gmaps-loader="travel-plan"]').forEach((node) => node.remove())

    const loader = new Loader({
      apiKey,
      version: "weekly",
    })

    loadPromise = Promise.all([loader.importLibrary("maps"), loader.importLibrary("marker")])
      .then(() => undefined)
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }

  return loadPromise
}

/** Reset cached loader state (tests / retry after key change). */
export function resetGoogleMapsLoader() {
  loadPromise = null
}
