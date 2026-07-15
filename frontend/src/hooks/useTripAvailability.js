"use client"

import { useEffect, useState, useMemo } from "react"
import { availabilityAPI } from "../services/api"
import { buildAvailabilityLookups } from "../components/availability/TripAvailability"
import { orderHotelsForDisplay } from "../utils/hotelAvailabilityMatch"

function unwrapAxiosPayload(result, label, warnings) {
  if (result.status === "fulfilled") {
    return result.value?.data ?? {}
  }
  const msg = result.reason?.response?.data?.message || result.reason?.message || `${label} unavailable`
  warnings.push(msg)
  return { data: [], realData: false, source: "" }
}

export function useTripAvailability(itinerary) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [hotels, setHotels] = useState([])
  const [flights, setFlights] = useState([])
  const [trains, setTrains] = useState([])
  const [buses, setBuses] = useState([])
  const [activities, setActivities] = useState([])
  const [isRealData, setIsRealData] = useState(false)
  const [dataSource, setDataSource] = useState("")

  const itineraryHotelNames = useMemo(
    () => [...new Set((itinerary?.days || []).map((d) => d.hotel?.name).filter(Boolean))],
    [itinerary],
  )

  useEffect(() => {
    if (!itinerary?.destination) {
      setLoading(false)
      setHotels([])
      setFlights([])
      setTrains([])
      setBuses([])
      setActivities([])
      return
    }

    let cancelled = false
    const dest = itinerary.destination
    const currency = itinerary.budget?.currency || "USD"
    const nights = itinerary.numberOfNights || 1

    const activityNames = (itinerary.days || [])
      .flatMap((d) => (d.activities || []).map((a) => a.name))
      .filter(Boolean)

    const load = async () => {
      setLoading(true)
      setError(null)
      setWarning(null)

      const warnings = []
      const transportParams = { destination: dest, currency, passengers: 1 }

      try {
        const settled = await Promise.allSettled([
          availabilityAPI.getFlights(transportParams),
          availabilityAPI.getTrains(transportParams),
          availabilityAPI.getBuses(transportParams),
          availabilityAPI.getHotels({
            destination: dest,
            nights,
            currency,
            ...(itineraryHotelNames.length > 0
              ? { names: JSON.stringify(itineraryHotelNames) }
              : {}),
          }),
        ])

        const flightPayload = unwrapAxiosPayload(settled[0], "Flights", warnings)
        const trainPayload = unwrapAxiosPayload(settled[1], "Trains", warnings)
        const busPayload = unwrapAxiosPayload(settled[2], "Buses", warnings)
        const hotelPayload = unwrapAxiosPayload(settled[3], "Hotels", warnings)

        let activityPayload = { data: [], realData: false, source: "", warning: undefined }
        try {
          const activityRes = await availabilityAPI.getActivities({
            destination: dest,
            ...(activityNames.length > 0
              ? { names: JSON.stringify(activityNames) }
              : {}),
            currency,
          })
          activityPayload = activityRes.data ?? {}
        } catch (err) {
          warnings.push(
            err?.response?.data?.message || err?.message || "Activities unavailable",
          )
        }

        if (cancelled) return

        const flightList = flightPayload.data ?? []
        const trainList = trainPayload.data ?? []
        const busList = busPayload.data ?? []
        const allHotels = hotelPayload.data ?? []
        const hotelList = orderHotelsForDisplay(itineraryHotelNames, allHotels, 5)
        const activityList = activityPayload.data ?? []

        setFlights(flightList)
        setTrains(trainList)
        setBuses(busList)
        setHotels(hotelList)
        setActivities(activityList)

        const apiWarnings = [
          flightPayload.warning,
          trainPayload.warning,
          busPayload.warning,
          hotelPayload.warning,
          activityPayload.warning,
        ].filter(Boolean)

        setIsRealData(
          Boolean(flightPayload.realData) ||
            Boolean(trainPayload.realData) ||
            Boolean(busPayload.realData) ||
            Boolean(hotelPayload.realData) ||
            Boolean(activityPayload.realData),
        )
        setDataSource(
          flightPayload.source ||
            trainPayload.source ||
            busPayload.source ||
            hotelPayload.source ||
            activityPayload.source ||
            "",
        )

        const allWarnings = [...apiWarnings, ...warnings]
        setWarning(allWarnings.length ? allWarnings[0] : null)

        if (
          flightList.length === 0 &&
          trainList.length === 0 &&
          busList.length === 0 &&
          hotelList.length === 0 &&
          activityList.length === 0
        ) {
          setError(allWarnings[0] || "Could not load availability for this destination")
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || "Could not load availability")
          setIsRealData(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [itinerary, itineraryHotelNames])

  const lookups = useMemo(
    () => buildAvailabilityLookups(hotels, flights, activities),
    [hotels, flights, activities],
  )

  return {
    loading,
    error,
    warning,
    hotels,
    flights,
    trains,
    buses,
    activities,
    lookups,
    isRealData,
    dataSource,
  }
}
