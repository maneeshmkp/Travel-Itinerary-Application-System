import { registerSW } from "virtual:pwa-register"

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return () => {}

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      console.info("[PWA] App ready to work offline")
    },
    onNeedRefresh() {
      console.info("[PWA] New version available")
    },
    onRegistered(registration) {
      if (registration && "sync" in window.ServiceWorkerRegistration.prototype) {
        console.info("[PWA] Background sync available")
      }
    },
  })

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_REQUEST") {
        window.dispatchEvent(new CustomEvent("travelplan:sync-request"))
      }
    })
  }

  return updateSW
}
