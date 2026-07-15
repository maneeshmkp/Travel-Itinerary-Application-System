"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink, Loader2, MapPin, Navigation, RefreshCw } from "lucide-react"
import { recommendationAPI } from "../../services/api"
import { LocationProvider, useLocationContext } from "../../context/LocationContext"
import { useToast } from "../../hooks/useToast"
import { logLocationDebug } from "../../utils/locationDebug"
import { isLowAccuracyPosition } from "../../utils/browserGeolocation"
import { fetchClientIpLocation } from "../../utils/clientIpGeolocation"
import Toast from "../Toast"

const MODES = {
  CURRENT: "current",
  TRIP: "trip",
}

const DEFAULT_TYPES = [
  { id: "restaurant", label: "Restaurants", icon: "🍽️" },
  { id: "cafe", label: "Cafés", icon: "☕" },
  { id: "attraction", label: "Attractions", icon: "🏛️" },
  { id: "atm", label: "ATMs", icon: "🏧" },
  { id: "hospital", label: "Hospitals", icon: "🏥" },
]

function permissionMessage(permission) {
  switch (permission) {
    case "granted":
      return "Location permission granted."
    case "denied":
      return "Location permission denied — enable it in browser settings or use Trip Destination."
    case "prompt":
      return "Click Current Location to use your device GPS."
    case "unsupported":
      return "Geolocation is not supported in this browser."
    default:
      return null
  }
}

function NearbyRecommendationsPanel({
  className = "",
  compact = false,
  tripDestination = "",
  tripTitle = "",
  itineraryId = "",
}) {
  const {
    coords: gpsCoords,
    loading: geoLoading,
    error: geoError,
    permission,
    isSupported,
    refreshLocation,
    clearLocation,
    clearError,
  } = useLocationContext()

  const { toasts, removeToast } = useToast()

  const [places, setPlaces] = useState([])
  const [tripAreaLabel, setTripAreaLabel] = useState("")
  const [locationMode, setLocationMode] = useState(MODES.TRIP)
  const [locationSourceLabel, setLocationSourceLabel] = useState("Trip Destination")
  const [activeGpsCoords, setActiveGpsCoords] = useState(null)
  const [gpsSource, setGpsSource] = useState("browser")
  const [tripCoords, setTripCoords] = useState(null)
  const [source, setSource] = useState("")
  const [warning, setWarning] = useState(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [activeType, setActiveType] = useState("restaurant")
  const [types, setTypes] = useState(DEFAULT_TYPES)
  const [initialized, setInitialized] = useState(false)

  const requestSeq = useRef(0)
  const mountedRef = useRef(true)
  const lastFetchKey = useRef("")
  const categoryTimer = useRef(null)
  const userWantsCurrentRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    recommendationAPI
      .getNearbyCategories()
      .then((res) => {
        if (!cancelled && res.data?.data?.length) setTypes(res.data.data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const cancelInFlightFetches = useCallback(() => {
    requestSeq.current += 1
    lastFetchKey.current = ""
  }, [])

  /** @returns {'ok' | 'stale' | 'skip' | 'error'} */
  const loadNearby = useCallback(
    async ({ mode, lat, lng, type, fresh = false }) => {
      const categoryType = type ?? activeType
      const seq = ++requestSeq.current

      const fetchKey = `${mode}|${lat ?? ""}|${lng ?? ""}|${categoryType}|${tripDestination}|${fresh}`
      if (fetchKey === lastFetchKey.current && !fresh) {
        return "skip"
      }
      lastFetchKey.current = fetchKey

      if (mountedRef.current) {
        setFetchLoading(true)
        setFetchError(null)
      }

      const params = {
        type: categoryType,
        limit: compact ? 5 : 8,
        locationSource: mode,
      }

      if (mode === MODES.CURRENT) {
        if (lat == null || lng == null) {
          if (seq === requestSeq.current && mountedRef.current) {
            setFetchLoading(false)
            setFetchError("Current location coordinates are missing.")
          }
          return "error"
        }
        params.lat = lat
        params.lng = lng
        if (fresh) params.noCache = "1"

        logLocationDebug("Request sent to backend", {
          sent: { latitude: lat, longitude: lng },
          state: gpsCoords
            ? {
                latitude: gpsCoords.latitude,
                longitude: gpsCoords.longitude,
                accuracy: gpsCoords.accuracy,
              }
            : null,
        })
      } else {
        if (!tripDestination) {
          if (seq === requestSeq.current && mountedRef.current) {
            setFetchLoading(false)
            setFetchError("No trip destination available.")
          }
          return "error"
        }
        params.destination = tripDestination
        if (fresh) params.noCache = "1"
      }

      try {
        const res = await recommendationAPI.getNearby(params)
        if (seq !== requestSeq.current) return "stale"
        if (!mountedRef.current) return "stale"

        const payload = res.data ?? {}
        const resolvedMode =
          payload.locationSource === MODES.TRIP ? MODES.TRIP : MODES.CURRENT

        if (userWantsCurrentRef.current && resolvedMode === MODES.TRIP) {
          return "stale"
        }

        logLocationDebug("Backend received (echoed in response)", {
          received: payload.requestCoordinates || payload.location,
          googlePlaces: payload.googlePlacesCoordinates,
          extra: { locationSource: payload.locationSource, count: payload.count },
        })

        if (resolvedMode === MODES.TRIP && payload.location) {
          setTripCoords({
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
          })
          setTripAreaLabel(payload.location.label || tripDestination)
        }

        setPlaces(payload.data ?? [])
        setLocationMode(resolvedMode)
        setLocationSourceLabel(
          payload.locationSourceLabel ||
            (resolvedMode === MODES.TRIP ? "Trip Destination" : "Current Location"),
        )
        setSource(payload.source || "")
        setWarning(payload.warning || null)
        setFetchError(null)
        return "ok"
      } catch (err) {
        if (seq !== requestSeq.current) return "stale"
        if (!mountedRef.current) return "stale"
        setPlaces([])
        setFetchError(err.message || "Could not load nearby places")
        return "error"
      } finally {
        if (seq === requestSeq.current && mountedRef.current) setFetchLoading(false)
      }
    },
    [activeType, compact, gpsCoords, tripDestination],
  )

  const loadCurrentWithFreshGps = useCallback(
    async (type, { fresh = true } = {}) => {
      userWantsCurrentRef.current = true
      cancelInFlightFetches()
      clearLocation()
      setActiveGpsCoords(null)

      if (mountedRef.current) {
        setLocationMode(MODES.CURRENT)
        setLocationSourceLabel("Current Location")
      }

      let position = await refreshLocation()
      if (!position) {
        userWantsCurrentRef.current = false
        return false
      }

      const browserFix = position

      if (isLowAccuracyPosition(browserFix.accuracy)) {
        let ipLoc = null
        try {
          const ipRes = await recommendationAPI.getClientLocation()
          ipLoc = ipRes.data?.data
        } catch {
          /* backend cannot resolve IP on localhost */
        }
        if (!ipLoc?.latitude) {
          ipLoc = await fetchClientIpLocation()
        }
        if (ipLoc?.latitude != null && ipLoc?.longitude != null) {
          logLocationDebug("IP fallback (browser accuracy too low)", {
            browser: {
              latitude: browserFix.latitude,
              longitude: browserFix.longitude,
              accuracy: browserFix.accuracy,
            },
            received: {
              latitude: ipLoc.latitude,
              longitude: ipLoc.longitude,
              label: ipLoc.label,
            },
          })
          position = {
            latitude: ipLoc.latitude,
            longitude: ipLoc.longitude,
            accuracy: ipLoc.accuracy ?? 15000,
            lowAccuracy: true,
          }
          setGpsSource("ip")
          clearError()
          setWarning(
            `Browser gave a rough estimate (~${Math.round(browserFix.accuracy / 1000)} km). ` +
              `Using your network IP location${ipLoc.label ? `: ${ipLoc.label}` : ""}.`,
          )
        } else {
          setGpsSource("network")
        }
      } else {
        setGpsSource("gps")
      }

      setActiveGpsCoords(position)

      const result = await loadNearby({
        mode: MODES.CURRENT,
        lat: position.latitude,
        lng: position.longitude,
        type,
        fresh,
      })

      if (result !== "ok" && result !== "stale") {
        userWantsCurrentRef.current = false
      }

      return result === "ok" || result === "stale"
    },
    [cancelInFlightFetches, clearError, clearLocation, loadNearby, refreshLocation],
  )

  const switchToTrip = useCallback(
    async (type, { fresh = false } = {}) => {
      userWantsCurrentRef.current = false
      cancelInFlightFetches()

      if (mountedRef.current) {
        setLocationMode(MODES.TRIP)
        setLocationSourceLabel("Trip Destination")
      }

      const result = await loadNearby({ mode: MODES.TRIP, type, fresh })
      return result === "ok"
    },
    [cancelInFlightFetches, loadNearby],
  )

  useEffect(() => {
    let alive = true
    userWantsCurrentRef.current = false
    setInitialized(false)
    setPlaces([])
    setTripCoords(null)
    setActiveGpsCoords(null)
    setGpsSource("browser")
    clearLocation()
    setLocationMode(MODES.TRIP)
    setLocationSourceLabel("Trip Destination")
    lastFetchKey.current = ""

    ;(async () => {
      if (tripDestination) {
        await switchToTrip(activeType)
      }
      if (alive) setInitialized(true)
    })()

    return () => {
      alive = false
      cancelInFlightFetches()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripDestination, itineraryId])

  const handleModeChange = async (mode) => {
    if (mode === MODES.CURRENT) {
      await loadCurrentWithFreshGps(activeType, { fresh: true })
    } else {
      await switchToTrip(activeType, { fresh: true })
    }
  }

  const handleTypeChange = (typeId) => {
    setActiveType(typeId)
    if (categoryTimer.current) clearTimeout(categoryTimer.current)
    categoryTimer.current = setTimeout(async () => {
      if (locationMode === MODES.CURRENT && activeGpsCoords) {
        await loadNearby({
          mode: MODES.CURRENT,
          lat: activeGpsCoords.latitude,
          lng: activeGpsCoords.longitude,
          type: typeId,
        })
      } else if (locationMode === MODES.CURRENT) {
        await loadCurrentWithFreshGps(typeId, { fresh: true })
      } else {
        await loadNearby({ mode: MODES.TRIP, type: typeId })
      }
    }, 300)
  }

  const handleRefresh = async () => {
    if (locationMode === MODES.CURRENT) {
      await loadCurrentWithFreshGps(activeType, { fresh: true })
    } else {
      await loadNearby({ mode: MODES.TRIP, type: activeType, fresh: true })
    }
  }

  const busy = geoLoading || fetchLoading || !initialized
  const permHint = permissionMessage(permission)

  return (
    <div className={className}>
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
      ))}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary shrink-0" />
            Near you
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Trip Destination shows places near this itinerary. Current Location uses your live GPS only.
          </p>
        </div>
        {initialized ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
            title="Refresh location and nearby places"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        ) : null}
      </div>

      {tripDestination ? (
        <div
          className="flex rounded-lg border border-border bg-muted/30 p-1 mb-3"
          role="tablist"
          aria-label="Location source for nearby recommendations"
        >
          <button
            type="button"
            role="tab"
            aria-selected={locationMode === MODES.CURRENT}
            disabled={busy || !isSupported}
            onClick={() => handleModeChange(MODES.CURRENT)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 ${
              locationMode === MODES.CURRENT
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-muted/50"
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            Current Location
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={locationMode === MODES.TRIP}
            disabled={busy}
            onClick={() => handleModeChange(MODES.TRIP)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 ${
              locationMode === MODES.TRIP
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-muted/50"
            }`}
          >
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            Trip Destination
          </button>
        </div>
      ) : null}

      <div
        className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          locationMode === MODES.CURRENT
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
            : "border-primary/40 bg-primary/10 text-primary"
        }`}
        role="status"
      >
        {locationMode === MODES.CURRENT ? (
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <Navigation className="h-3 w-3 shrink-0" aria-hidden />
        )}
        Based on: {locationSourceLabel}
      </div>

      {permHint ? (
        <p className="text-[11px] text-muted-foreground mb-2">{permHint}</p>
      ) : null}

      {!initialized ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Loading nearby recommendations…
        </div>
      ) : null}

      {initialized && locationMode === MODES.CURRENT && activeGpsCoords ? (
        <div
          className={`mb-3 rounded-md border px-3 py-2 font-mono text-xs text-foreground ${
            isLowAccuracyPosition(activeGpsCoords.accuracy)
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}
          aria-label="Live location coordinates"
        >
          <div>Latitude: {Number(activeGpsCoords.latitude).toFixed(6)}</div>
          <div>Longitude: {Number(activeGpsCoords.longitude).toFixed(6)}</div>
          <div>Accuracy: {Math.round(activeGpsCoords.accuracy)} meters</div>
          <div className="mt-1 font-sans text-muted-foreground">
            Source:{" "}
            {gpsSource === "ip"
              ? "Your network IP (more accurate on desktop)"
              : gpsSource === "network"
                ? "Browser network estimate (low accuracy — enable desktop location or use a phone)"
                : "Browser GPS"}
          </div>
          {source && source !== "demo" ? (
            <div className="mt-1 font-sans text-emerald-700 dark:text-emerald-400">Live nearby data</div>
          ) : null}
        </div>
      ) : null}

      {initialized && locationMode === MODES.TRIP && tripCoords ? (
        <p className="text-xs text-muted-foreground mb-3 font-mono">
          Trip: {Number(tripCoords.latitude).toFixed(6)}, {Number(tripCoords.longitude).toFixed(6)}
          {tripAreaLabel ? (
            <span className="font-sans text-muted-foreground"> · {tripAreaLabel}</span>
          ) : null}
          {source && source !== "demo" ? (
            <span className="font-sans ml-2 text-emerald-700 dark:text-emerald-400">· Live</span>
          ) : null}
        </p>
      ) : null}

      {geoError && locationMode === MODES.CURRENT ? (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {geoError}
        </p>
      ) : null}

      {initialized ? (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {types.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTypeChange(type.id)}
                disabled={busy}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                  activeType === type.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted/50"
                }`}
              >
                <span aria-hidden>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>

          {warning ? (
            <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900">
              {warning}
            </p>
          ) : null}

          {fetchError ? (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {fetchError}
            </p>
          ) : null}

          {busy && places.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {geoLoading ? "Getting your GPS location…" : "Finding nearby places…"}
            </div>
          ) : null}

          {!busy && places.length === 0 && !fetchError ? (
            <p className="text-sm text-muted-foreground py-2">
              No places found within range for this category.
            </p>
          ) : null}

          <ul className={`space-y-2 ${compact ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
            {places.map((place) => (
              <li
                key={place.id}
                className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground line-clamp-2">
                      <span className="mr-1" aria-hidden>
                        {place.icon}
                      </span>
                      {place.name}
                    </p>
                    {place.address ? (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{place.address}</p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {place.rating != null ? <span>★ {place.rating}</span> : null}
                      {place.distanceKm != null ? <span>{place.distanceKm} km away</span> : null}
                      {place.openNow === true ? (
                        <span className="text-emerald-700 dark:text-emerald-400">Open now</span>
                      ) : place.openNow === false ? (
                        <span>Check hours</span>
                      ) : null}
                    </div>
                  </div>
                  {place.mapsUrl ? (
                    <a
                      href={place.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted/60"
                      title="Open in Google Maps"
                    >
                      Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

export default function NearbyRecommendations({ itineraryId, ...props }) {
  const providerKey = itineraryId || props.tripDestination || "nearby"
  return (
    <LocationProvider key={providerKey}>
      <NearbyRecommendationsPanel itineraryId={itineraryId} {...props} />
    </LocationProvider>
  )
}
