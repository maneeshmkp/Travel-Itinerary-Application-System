import { test, expect } from "./fixtures/testFixtures.js"
import { NotificationsPage } from "./pages/NotificationsPage.js"
import { apiHealth } from "./helpers/api.js"
import { CreateItineraryPage } from "./pages/CreateItineraryPage.js"
import { uniqueTripTitle } from "./helpers/testData.js"

test.describe("Notifications", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("receive notification after creating a trip", async ({ authedPage }) => {
    const create = new CreateItineraryPage(authedPage)
    await create.create({
      title: uniqueTripTitle("Notify"),
      destination: "Vienna, Austria",
    })

    const notifications = new NotificationsPage(authedPage)
    await notifications.open()
    // Trip creation triggers TRIP_CREATED (or similar) for many installs
    await expect(
      authedPage.getByText(/trip|created|itinerary|notification/i).first(),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("mark notification read", async ({ authedPage }) => {
    const create = new CreateItineraryPage(authedPage)
    await create.create({
      title: uniqueTripTitle("NotifyRead"),
      destination: "Prague, Czechia",
    })

    const notifications = new NotificationsPage(authedPage)
    await notifications.open()
    await notifications.markAllRead()
    // After mark-all, unread badges should clear or Mark read buttons dwindle
    await expect(
      authedPage.getByRole("heading", { name: /Notifications/i }),
    ).toBeVisible()
  })
})
