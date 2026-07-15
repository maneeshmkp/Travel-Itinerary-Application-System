const isDev = import.meta.env.DEV

export function logLocationDebug(stage, data = {}) {
  if (!isDev) return
  console.group(`[nearby-location] ${stage}`)
  if (data.browser != null) {
    console.log("Browser returned:", data.browser)
  }
  if (data.state != null) {
    console.log("React state:", data.state)
  }
  if (data.sent != null) {
    console.log("Request sent to backend:", data.sent)
  }
  if (data.received != null) {
    console.log("Backend received:", data.received)
  }
  if (data.googlePlaces != null) {
    console.log("Google Places request:", data.googlePlaces)
  }
  if (data.extra) {
    console.log(data.extra)
  }
  console.groupEnd()
}
