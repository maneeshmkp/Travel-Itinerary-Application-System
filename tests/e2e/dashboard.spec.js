import { test, expect } from "./fixtures/testFixtures.js"
import { AnalyticsPage } from "./pages/AnalyticsPage.js"
import { ItineraryDetailPage } from "./pages/ItineraryDetailPage.js"
import { apiHealth } from "./helpers/api.js"

test.describe("Dashboard", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("analytics dashboard overview", async ({ authedPage }) => {
    const analytics = new AnalyticsPage(authedPage)
    await analytics.open()
    await expect(authedPage.getByRole("heading", { name: /Travel Analytics/i })).toBeVisible()
    await analytics.refresh()
  })

  test("trip overview tab", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const detail = new ItineraryDetailPage(page)
    await detail.open(tripUrl)
    await detail.openTab("Overview")
    await expect(page.getByRole("heading", { name: /Overview/i })).toBeVisible({
      timeout: 20_000,
    })
  })

  test("trip budget / finance overview", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const detail = new ItineraryDetailPage(page)
    await detail.open(tripUrl)
    await detail.gotoHash("finance")
    await expect(page.getByRole("heading", { name: /Finance/i })).toBeVisible({
      timeout: 20_000,
    })
  })
})
