import { useCallback, useRef, useState } from "react"
import { copilotStream } from "../services/copilotApi"

export function useCopilotChat({ itineraryId, itinerarySnapshot, sessionId: initialSessionId, onItineraryUpdated }) {
  const [sessionId, setSessionId] = useState(initialSessionId || null)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const abortRef = useRef(null)

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }, [])

  const send = useCallback(
    async (messages, { useStream = true } = {}) => {
      const payload = {
        messages,
        sessionId,
        itineraryId,
        itinerarySnapshot,
      }

      if (!useStream) {
        const { copilotAPI } = await import("../services/copilotApi")
        const res = await copilotAPI.send(payload)
        const data = res.data?.data || {}
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.itineraryUpdated && data.itinerary) onItineraryUpdated?.(data.itinerary)
        return data
      }

      cancelStream()
      const ac = new AbortController()
      abortRef.current = ac
      setStreaming(true)
      setStreamText("")

      try {
        const data = await copilotStream(payload, {
          signal: ac.signal,
          onToken: (text) => setStreamText((prev) => prev + text),
          onStatus: () => {},
        })
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.itineraryUpdated && data.itinerary) onItineraryUpdated?.(data.itinerary)
        return { ...data, reply: streamText + (data.reply || "") }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [sessionId, itineraryId, itinerarySnapshot, onItineraryUpdated, cancelStream, streamText],
  )

  return { send, streaming, streamText, sessionId, setSessionId, cancelStream }
}
