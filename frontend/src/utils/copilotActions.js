import { itineraryAPI } from "../services/api"
import { getPublicItineraryUrl, itineraryPdfFilename } from "./shareUrl"

export async function executeCopilotQuickAction(action, ctx = {}) {
  const { navigate, showSuccess, showError, itineraryId, planDraft, onMapFocus, onRefresh } = ctx
  const id = action.payload?.itineraryId || itineraryId

  switch (action.id) {
    case "open_map":
      onMapFocus?.(action.payload)
      return { handled: true }
    case "show_flights":
    case "show_hotels":
      if (id && navigate) {
        navigate(`/itineraries/${id}#availability`)
        return { handled: true, navigate: true }
      }
      return { handled: false, suggest: `Show ${action.id === "show_flights" ? "flights" : "hotels"} for this trip` }
    case "book_flight":
    case "book_hotel":
      if (id && navigate) {
        navigate(`/itineraries/${id}#availability`)
        return { handled: true }
      }
      return { handled: false }
    case "download_pdf":
      if (!id) return { handled: false }
      try {
        const res = await itineraryAPI.downloadPdf(id)
        const blob = new Blob([res.data], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = itineraryPdfFilename(id)
        a.click()
        URL.revokeObjectURL(url)
        showSuccess?.("PDF downloaded")
        return { handled: true }
      } catch (e) {
        showError?.(e.message || "PDF download failed")
        return { handled: false }
      }
    case "share_trip":
      if (!id) return { handled: false }
      try {
        await navigator.clipboard.writeText(getPublicItineraryUrl(id))
        showSuccess?.("Trip link copied!")
        return { handled: true }
      } catch {
        showError?.("Could not copy link")
        return { handled: false }
      }
    case "optimize_route":
      if (!id) return { handled: false }
      try {
        await itineraryAPI.optimize(id)
        showSuccess?.("Route optimized")
        onRefresh?.()
        return { handled: true }
      } catch (e) {
        showError?.(e.message || "Optimize failed")
        return { handled: false }
      }
    case "generate_itinerary":
      return { handled: false, planDraft: action.payload || planDraft }
    default:
      return { handled: false }
  }
}
