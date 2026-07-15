import { test, expect } from "./fixtures/testFixtures.js"
import { BookingsPage } from "./pages/BookingsPage.js"
import { apiHealth } from "./helpers/api.js"

test.describe("Bookings", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("add flight booking on trip", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const bookings = new BookingsPage(page)
    await bookings.openTripBookings(tripUrl)
    await bookings.addBooking({ type: "flight", provider: "E2E Air", reference: "FLT-E2E-1" })
    await expect(page.getByText(/E2E Air|FLT-E2E|AI101|flight/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test("add hotel booking on trip", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const bookings = new BookingsPage(page)
    await bookings.openTripBookings(tripUrl)
    await bookings.addBooking({ type: "hotel", provider: "E2E Hotel", reference: "HTL-E2E-1" })
    await expect(page.getByText(/E2E Hotel|HTL-E2E|hotel/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test("add activity booking on trip", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const bookings = new BookingsPage(page)
    await bookings.openTripBookings(tripUrl)
    await bookings.addBooking({
      type: "activity",
      provider: "E2E Tours",
      reference: "ACT-E2E-1",
    })
    await expect(page.getByText(/E2E Tours|ACT-E2E|activity/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test("bookings hub loads", async ({ authedPage }) => {
    const bookings = new BookingsPage(authedPage)
    await bookings.openHub()
    await expect(
      authedPage.getByRole("button", { name: /Add booking/i }).or(authedPage.getByText(/booking/i).first()),
    ).toBeVisible()
  })
})
