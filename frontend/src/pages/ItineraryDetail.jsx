"use client"

import { useState, useEffect, useMemo, lazy, Suspense } from "react"
import { useParams, useNavigate, Link, useLocation } from "react-router-dom"
import { MapPin, Loader2 } from "lucide-react"
import { itineraryAPI, recommendationAPI, aiAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../hooks/useToast"
import { useTripWeather } from "../hooks/useTripWeather"
import { usePlaceWeather } from "../hooks/usePlaceWeather"
import { useTripAvailability } from "../hooks/useTripAvailability"
import Toast from "../components/Toast"
import { DEFAULT_CURRENCY } from "../utils/budgetCalculations"
import { getPublicItineraryUrl, itineraryPdfFilename } from "../utils/shareUrl"
import { useAskAi } from "../context/AskAiContext"
import { itineraryToAiSnapshot } from "../utils/itinerarySnapshot"

import TripHero from "../components/workspace/TripHero"
import WorkspaceNav from "../components/workspace/WorkspaceNav"
import MobileTabBar from "../components/workspace/MobileTabBar"
import TripRightSidebar from "../components/workspace/TripRightSidebar"
import FloatingAiButton from "../components/workspace/FloatingAiButton"
import TabSkeleton from "../components/workspace/TabSkeleton"
import { tabFromHash } from "../components/workspace/workspaceConfig"

const LOGIN_SAVE_MESSAGE = "Please log in to save itineraries"

// Lazy-load each tab so only the active module's chunk is downloaded.
const OverviewTab = lazy(() => import("../components/workspace/tabs/OverviewTab"))
const ScheduleTab = lazy(() => import("../components/workspace/tabs/ScheduleTab"))
const TransportTab = lazy(() => import("../components/workspace/tabs/TransportTab"))
const BookingsTab = lazy(() => import("../components/workspace/tabs/BookingsTab"))
const FinanceTab = lazy(() => import("../components/workspace/tabs/FinanceTab"))
const DocumentsTab = lazy(() => import("../components/workspace/tabs/DocumentsTab"))
const AiTab = lazy(() => import("../components/workspace/tabs/AiTab"))
const MapTab = lazy(() => import("../components/workspace/tabs/MapTab"))
const InsightsTab = lazy(() => import("../components/workspace/tabs/InsightsTab"))

const TAB_COMPONENTS = {
  overview: OverviewTab,
  schedule: ScheduleTab,
  transport: TransportTab,
  bookings: BookingsTab,
  finance: FinanceTab,
  documents: DocumentsTab,
  ai: AiTab,
  map: MapTab,
  insights: InsightsTab,
}

const ItineraryDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { openAskAiWithTrip, mapFocus } = useAskAi()
  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [itinerary, setItinerary] = useState(null)
  const [similarItineraries, setSimilarItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [coverRefreshLoading, setCoverRefreshLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [copyLinkLoading, setCopyLinkLoading] = useState(false)
  const [optimizeLoading, setOptimizeLoading] = useState(false)
  const [scheduleAdjustId, setScheduleAdjustId] = useState(null)
  const [activeTab, setActiveTab] = useState(() => tabFromHash(location.hash) || "overview")

  const publicShareUrl = id ? getPublicItineraryUrl(id) : ""
  const canEdit = Boolean(itinerary?.collaboration?.canEdit)

  const refreshItinerary = async () => {
    try {
      const response = await itineraryAPI.getById(id)
      setItinerary(response.data.data)
    } catch {
      /* ignore */
    }
  }

  const changeTab = (tab) => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Keep the active tab in sync with deep-link hashes (notifications, map focus).
  useEffect(() => {
    const mapped = tabFromHash(location.hash)
    if (mapped) setActiveTab(mapped)
  }, [location.hash])

  useEffect(() => {
    if (mapFocus) {
      setActiveTab("map")
      setTimeout(() => {
        document.getElementById("trip-map")?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 150)
    }
  }, [mapFocus])

  const {
    forecastByDay,
    loading: weatherLoading,
    error: weatherError,
    demo: weatherDemo,
    demoReason: weatherDemoReason,
    cachedAtHours: weatherCachedAtHours,
    fromCache: weatherFromCache,
  } = useTripWeather({
    destination: itinerary?.destination,
    totalDays: itinerary?.totalDays,
    tripId: id,
    enabled: Boolean(itinerary?.destination),
  })

  const {
    places: placeWeatherList,
    placesByDay,
    lookupByActivity,
    loading: placeWeatherLoading,
    error: placeWeatherError,
    demo: placeWeatherDemo,
  } = usePlaceWeather({
    tripId: id,
    enabled: Boolean(id && itinerary),
  })

  const {
    loading: availabilityLoading,
    error: availabilityError,
    warning: availabilityWarning,
    hotels: availabilityHotels,
    flights: availabilityFlights,
    trains: availabilityTrains,
    buses: availabilityBuses,
    activities: availabilityActivities,
    lookups: availabilityLookups,
    isRealData: availabilityIsReal,
    dataSource: availabilitySource,
  } = useTripAvailability(itinerary)

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const response = await itineraryAPI.getById(id)
        let data = response.data.data
        setItinerary(data)

        if (!data?.coverImage?.url) {
          try {
            const refresh = await itineraryAPI.refreshCoverImage(id)
            if (refresh.data?.data?.itinerary) {
              data = refresh.data.data.itinerary
              setItinerary(data)
            }
          } catch {
            /* fallback image will show in UI */
          }
        }

        setSimilarLoading(true)
        try {
          const similarResponse = await recommendationAPI.getSimilar(id)
          setSimilarItineraries(similarResponse.data.data)
        } catch (error) {
          console.error("Error fetching similar itineraries:", error)
        } finally {
          setSimilarLoading(false)
        }
      } catch (error) {
        console.error("Error fetching itinerary:", error)
        navigate("/itineraries")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchItinerary()
    }
  }, [id, navigate])

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setSaved(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await itineraryAPI.checkSaved(id)
        if (!cancelled) setSaved(Boolean(res.data?.saved))
      } catch {
        if (!cancelled) setSaved(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated])

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("collab")
    if (!token || !id || !isAuthenticated || !itinerary) return
    if (itinerary.collaboration?.canEdit) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await itineraryAPI.joinCollaboration(id, token)
        if (cancelled) return
        const collab = res.data?.data?.collaboration
        if (collab) {
          setItinerary((prev) => (prev ? { ...prev, collaboration: collab } : prev))
        } else {
          await refreshItinerary()
        }
        showSuccess(res.data?.message || "You joined as a collaborator")
      } catch (err) {
        if (!cancelled) {
          showError(err.message || "Could not join this trip")
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated, location.search, itinerary])

  const handleRefreshCoverImage = async () => {
    if (!id) return
    setCoverRefreshLoading(true)
    try {
      const res = await itineraryAPI.refreshCoverImage(id)
      const updated = res.data?.data?.itinerary
      if (updated) setItinerary(updated)
      showSuccess("Cover image updated")
    } catch (err) {
      showError(err?.response?.data?.error || "Could not refresh cover image")
    } finally {
      setCoverRefreshLoading(false)
    }
  }

  const handleOptimizeTrip = async () => {
    if (!id) return
    if (!canEdit) {
      showError(isAuthenticated ? "You need edit access to optimize this trip" : "Log in and join as a collaborator to optimize")
      return
    }
    setOptimizeLoading(true)
    try {
      const res = await itineraryAPI.optimize(id)
      if (res.data?.data) setItinerary(res.data.data)
      showSuccess(res.data?.message || "Trip optimized for shorter travel between stops")
    } catch (err) {
      showError(err?.response?.data?.message || err?.response?.data?.error || "Could not optimize this trip")
    } finally {
      setOptimizeLoading(false)
    }
  }

  const handleAdjustActivity = async (activity, skipped) => {
    if (!id || !activity?._id) return
    if (!canEdit) {
      showError(
        isAuthenticated
          ? "You need edit access to adjust the schedule"
          : "Log in and join as a collaborator to skip activities",
      )
      return
    }
    setScheduleAdjustId(activity._id)
    try {
      const res = await itineraryAPI.adjustActivity(id, activity._id, { skipped })
      if (res.data?.data) setItinerary(res.data.data)
      showSuccess(res.data?.message || (skipped ? "Activity skipped" : "Activity restored"))
    } catch (err) {
      showError(err?.response?.data?.message || err?.response?.data?.error || "Could not update schedule")
    } finally {
      setScheduleAdjustId(null)
    }
  }

  const handleSaveClick = async () => {
    if (!id) return
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: { pathname: `/itineraries/${id}`, search: "" }, message: LOGIN_SAVE_MESSAGE },
      })
      return
    }
    setSaveLoading(true)
    try {
      if (saved) {
        await itineraryAPI.unsaveForUser(id)
        setSaved(false)
        showSuccess("Removed from saved")
      } else {
        await itineraryAPI.saveForUser(id)
        setSaved(true)
        showSuccess("Itinerary saved")
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Could not update saved itinerary.")
    } finally {
      setSaveLoading(false)
    }
  }

  const handleShare = async () => {
    if (!itinerary) return
    const url = publicShareUrl || window.location.href
    const shareData = { title: itinerary.title, text: "Check out this itinerary on TravelPlan", url }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData)
        showSuccess("Shared successfully")
        return
      } catch (err) {
        if (err?.name === "AbortError") return
      }
    }
    await handleCopyPublicLink()
  }

  const handleCopyPublicLink = async () => {
    if (!publicShareUrl) return
    setCopyLinkLoading(true)
    try {
      await navigator.clipboard.writeText(publicShareUrl)
      showSuccess("Public link copied to clipboard")
    } catch {
      showError("Could not copy the link. Select and copy it manually.")
    } finally {
      setCopyLinkLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!id || !itinerary) return
    setPdfLoading(true)
    try {
      const res = await itineraryAPI.downloadPdf(id)
      const blob = new Blob([res.data], { type: "application/pdf" })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = itineraryPdfFilename(itinerary.title)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
      showSuccess("PDF downloaded")
    } catch (err) {
      showError(err?.message || "Could not generate PDF. Please try again.")
    } finally {
      setPdfLoading(false)
    }
  }

  const handleAiTripSummary = async () => {
    if (!itinerary) return
    setAiSummaryLoading(true)
    try {
      const snap = itineraryToAiSnapshot(itinerary)
      const res = await aiAPI.tripSummary({ itinerary: snap })
      const summary = res.data?.data?.summary
      const demo = res.data?.demo
      if (!summary) {
        showError("No summary returned.")
        return
      }
      const text = `${summary}\n\n${window.location.href}`
      await navigator.clipboard.writeText(text)
      showSuccess(
        demo
          ? "AI summary + link copied (demo). Set GEMINI_API_KEY or OPENAI_API_KEY on the server for richer copy."
          : "AI summary and link copied to clipboard.",
      )
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Could not generate summary.")
    } finally {
      setAiSummaryLoading(false)
    }
  }

  const askAi = (message = "") => {
    if (!itinerary) return
    openAskAiWithTrip(message, {
      itineraryId: id,
      snapshot: itineraryToAiSnapshot(itinerary),
      onRefresh: refreshItinerary,
    })
  }

  const firstDayWeather = forecastByDay?.size ? Array.from(forecastByDay.entries())[0][1] : null

  // Derive "today" activities for the slim sidebar (no extra fetch).
  const todayActivities = useMemo(() => {
    if (!itinerary?.days?.length) return []
    let n = 1
    if (itinerary.startDate) {
      const start = new Date(itinerary.startDate)
      start.setHours(0, 0, 0, 0)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const diff = Math.floor((now - start) / 86400000) + 1
      n = Math.min(Math.max(diff, 1), itinerary.totalDays || itinerary.days.length)
    }
    const day = itinerary.days.find((d) => d.dayNumber === n) || itinerary.days[0]
    return day?.activities || []
  }, [itinerary])

  const ctx = {
    id,
    itinerary,
    setItinerary,
    refreshItinerary,
    canEdit,
    isAuthenticated,
    showSuccess,
    showError,
    activeTab,
    setActiveTab: changeTab,
    // weather
    forecastByDay,
    weatherLoading,
    weatherError,
    weatherDemo,
    weatherDemoReason,
    weatherCachedAtHours,
    weatherFromCache,
    placesByDay,
    placeWeatherList,
    placeWeatherLoading,
    placeWeatherError,
    placeWeatherDemo,
    lookupByActivity,
    // availability
    availabilityLoading,
    availabilityError,
    availabilityWarning,
    availabilityHotels,
    availabilityFlights,
    availabilityTrains,
    availabilityBuses,
    availabilityActivities,
    availabilityLookups,
    availabilityIsReal,
    availabilitySource,
    // schedule
    scheduleAdjustId,
    handleAdjustActivity,
    handleOptimizeTrip,
    optimizeLoading,
    // ai + export
    openAskAi: askAi,
    handleAiTripSummary,
    aiSummaryLoading,
    handleRefreshCoverImage,
    coverRefreshLoading,
    handleCopyPublicLink,
    copyLinkLoading,
    publicShareUrl,
    mapFocus,
    // insights
    similarItineraries,
    similarLoading,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Itinerary not found</h2>
          <p className="text-muted-foreground mb-4">The itinerary you're looking for doesn't exist.</p>
          <Link
            to="/itineraries"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md font-medium transition-colors"
          >
            Browse Itineraries
          </Link>
        </div>
      </div>
    )
  }

  const currency = itinerary.budget?.currency || itinerary.budgetInsight?.currency || DEFAULT_CURRENCY
  const ActiveTab = TAB_COMPONENTS[activeTab] || OverviewTab

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {toasts.map((toast) => (
        <Toast key={toast.id} type={toast.type} message={toast.message} onClose={() => removeToast(toast.id)} />
      ))}

      <TripHero
        itinerary={itinerary}
        currency={currency}
        firstDayWeather={firstDayWeather}
        onBack={() => navigate(-1)}
        saved={saved}
        saveLoading={saveLoading}
        onSave={handleSaveClick}
        onShare={handleShare}
        onExportPdf={handleDownloadPdf}
        pdfLoading={pdfLoading}
        onOptimize={handleOptimizeTrip}
        optimizeLoading={optimizeLoading}
        onAskAi={() => askAi("")}
        canEdit={canEdit}
      />

      <div className="mt-6">
        <WorkspaceNav activeTab={activeTab} onChange={changeTab} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-8">
          <main className="flex-1 min-w-0">
            <Suspense fallback={<TabSkeleton />}>
              <ActiveTab ctx={ctx} />
            </Suspense>
          </main>

          <TripRightSidebar
            itinerary={itinerary}
            currency={currency}
            forecastByDay={forecastByDay}
            weatherLoading={weatherLoading}
            todayActivities={todayActivities}
            onAskAi={() => askAi("")}
            onGoTo={changeTab}
          />
        </div>
      </div>

      <FloatingAiButton onClick={() => askAi("")} />
      <MobileTabBar activeTab={activeTab} onChange={changeTab} />
    </div>
  )
}

export default ItineraryDetail
