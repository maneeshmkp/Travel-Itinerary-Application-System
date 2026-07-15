"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

const AskAiContext = createContext(null)

export function AskAiProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [seedMessage, setSeedMessage] = useState("")
  const [tripContext, setTripContext] = useState(null)
  const [mapFocus, setMapFocus] = useState(null)

  const openAskAi = useCallback((message = "", context = null) => {
    setSeedMessage(String(message || "").trim())
    setTripContext(context)
    setOpen(true)
  }, [])

  const openAskAiWithTrip = useCallback((message = "", { itineraryId, snapshot, onRefresh } = {}) => {
    setSeedMessage(String(message || "").trim())
    setTripContext({ itineraryId, snapshot, onRefresh })
    setOpen(true)
  }, [])

  const closeAskAi = useCallback(() => {
    setOpen(false)
    setSeedMessage("")
    setTripContext(null)
  }, [])

  const value = useMemo(
    () => ({
      open,
      seedMessage,
      tripContext,
      mapFocus,
      setMapFocus,
      openAskAi,
      openAskAiWithTrip,
      closeAskAi,
    }),
    [open, seedMessage, tripContext, mapFocus, openAskAi, openAskAiWithTrip, closeAskAi],
  )

  return <AskAiContext.Provider value={value}>{children}</AskAiContext.Provider>
}

export function useAskAi() {
  const ctx = useContext(AskAiContext)
  if (!ctx) throw new Error("useAskAi must be used within AskAiProvider")
  return ctx
}
