/**
 * Shared Playwright fixture: authenticated page + trip bootstrap.
 */
import { test as base, expect } from "@playwright/test"
import { apiSignup, injectAuth, apiHealth, apiCreateItinerary } from "../helpers/api.js"
import { DEFAULT_PASSWORD, uniqueTripTitle } from "../helpers/testData.js"
import { CreateItineraryPage } from "../pages/CreateItineraryPage.js"
import { LoginPage } from "../pages/LoginPage.js"

export const test = base.extend({
  account: async ({}, use) => {
    const healthy = await apiHealth()
    if (!healthy) {
      test.skip(true, "Backend API not reachable — start backend or set E2E_API_URL")
    }
    const account = await apiSignup()
    await use(account)
  },

  authedPage: async ({ page, account }, use) => {
    await injectAuth(page, account)
    await use(page)
  },

  /** Authenticated page with an itinerary (seeded via API for speed/stability) */
  tripPage: async ({ authedPage, account }, use) => {
    const { id } = await apiCreateItinerary(account.token, {
      title: uniqueTripTitle(),
      destination: "Barcelona, Spain",
    })
    const tripUrl = `/itineraries/${id}`
    await authedPage.goto(tripUrl)
    await use({ page: authedPage, tripUrl, tripId: id })
  },
})

export { expect, LoginPage, DEFAULT_PASSWORD, CreateItineraryPage }
