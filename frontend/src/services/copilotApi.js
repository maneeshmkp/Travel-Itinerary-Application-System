import api from "./api"
import { getAuthToken } from "../utils/authStorage"

const aiTimeout = { timeout: 120000 }

export const copilotAPI = {
  send: (payload) => api.post("/chat", payload, aiTimeout),
  listSessions: () => api.get("/chat/sessions"),
  createSession: (payload) => api.post("/chat/sessions", payload),
  getSession: (id) => api.get(`/chat/sessions/${id}`),
  renameSession: (id, title) => api.patch(`/chat/sessions/${id}`, { title }),
  deleteSession: (id) => api.delete(`/chat/sessions/${id}`),
  getExpenses: (itineraryId) => api.get(`/chat/expenses/${itineraryId}`),
  addExpense: (itineraryId, payload) => api.post(`/chat/expenses/${itineraryId}`, payload),
}

/**
 * SSE stream from POST /chat/stream
 */
export async function copilotStream(payload, { signal, onToken, onStatus } = {}) {
  const base = api.defaults.baseURL || "/api"
  const token = getAuthToken()
  const res = await fetch(`${base}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Stream failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullReply = ""
  const meta = {}

  // eslint-disable-next-line no-constant-condition -- streaming SSE loop
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() || ""

    for (const part of parts) {
      const lines = part.split("\n")
      let event = "message"
      let data = ""
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        if (line.startsWith("data:")) data = line.slice(5).trim()
      }
      if (!data) continue
      try {
        const parsed = JSON.parse(data)
        if (event === "token" && parsed.text) {
          fullReply += parsed.text
          onToken?.(parsed.text)
        } else if (event === "status") {
          onStatus?.(parsed)
        } else if (event === "done") {
          Object.assign(meta, parsed)
        } else if (event === "error") {
          throw new Error(parsed.message || "Stream error")
        } else if (event === "cancelled") {
          throw new Error("Cancelled")
        }
      } catch (e) {
        if (e.message !== "Cancelled") throw e
      }
    }
  }

  return { reply: fullReply, ...meta }
}
