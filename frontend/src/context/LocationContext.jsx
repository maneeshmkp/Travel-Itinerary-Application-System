"use client"

import { createContext, useContext, useMemo } from "react"
import { useCurrentLocation } from "../hooks/useCurrentLocation"

const LocationContext = createContext(null)

export function LocationProvider({ children }) {
  const location = useCurrentLocation()
  const value = useMemo(() => location, [location])
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationContext() {
  const ctx = useContext(LocationContext)
  if (!ctx) {
    throw new Error("useLocationContext must be used within a LocationProvider")
  }
  return ctx
}

/** Safe hook when provider may be absent (returns null). */
export function useOptionalLocationContext() {
  return useContext(LocationContext)
}
