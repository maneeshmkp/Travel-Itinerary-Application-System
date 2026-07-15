import { mockBuses, mockTrains } from "./mockAvailabilityService.js"
import { buildBusPartnerLinks, buildTrainPartnerLinks } from "../utils/transportPartnerLinks.js"

function defaultJourneyDate(offsetDays = 30) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function attachBusPartners(item) {
  const partnerLinks = buildBusPartnerLinks({
    origin: item.origin,
    destination: item.destination,
    date: item.date,
  })
  const primary = partnerLinks[0]
  return {
    ...item,
    isRecommendation: true,
    isEstimate: true,
    priceLabel: "Typical fare",
    availability: "available",
    availabilityLabel: "Suggestion",
    partnerLinks,
    bookingUrl: primary?.url || null,
    bookingProvider: primary?.provider || "redBus",
  }
}

function attachTrainPartners(item) {
  const partnerLinks = buildTrainPartnerLinks({
    origin: item.origin,
    destination: item.destination,
    date: item.date,
  })
  const primary = partnerLinks[0]
  return {
    ...item,
    isRecommendation: true,
    isEstimate: true,
    priceLabel: "Typical fare",
    availability: "available",
    availabilityLabel: "Suggestion",
    partnerLinks,
    bookingUrl: primary?.url || null,
    bookingProvider: primary?.provider || "IRCTC",
  }
}

/**
 * Curated bus recommendations with partner booking links (no inventory API).
 */
export function getBusRecommendations(params) {
  const withDate = {
    ...params,
    date: params.date || defaultJourneyDate(),
    currency: params.currency || "INR",
  }
  return mockBuses(withDate).map(attachBusPartners)
}

/**
 * Curated train recommendations with partner booking links (no inventory API).
 */
export function getTrainRecommendations(params) {
  const withDate = {
    ...params,
    date: params.date || defaultJourneyDate(),
    currency: params.currency || "INR",
  }
  return mockTrains(withDate).map(attachTrainPartners)
}
