import { BasePage } from "./BasePage.js"
import { ItineraryDetailPage } from "./ItineraryDetailPage.js"

export class BookingsPage extends BasePage {
  constructor(page) {
    super(page)
    this.detail = new ItineraryDetailPage(page)
  }

  async openHub() {
    await this.goto("/bookings")
    await this.page.getByRole("heading", { name: /Booking/i }).first().waitFor({ timeout: 20_000 }).catch(() => {})
  }

  async openTripBookings(tripUrlOrId) {
    await this.detail.open(tripUrlOrId)
    await this.detail.gotoHash("bookings")
  }

  async addBooking({ type = "flight", provider = "E2E Airways", reference = "E2E-REF-1" } = {}) {
    await this.page.getByRole("button", { name: /Add booking/i }).first().click()
    const typeSelect = this.page.locator("select").filter({ has: this.page.locator("option", { hasText: /flight|hotel|activity/i }) }).first()
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.selectOption({ label: new RegExp(type, "i") }).catch(async () => {
        await typeSelect.selectOption(type)
      })
    }
    await this.page.getByPlaceholder(/Airline, hotel/i).fill(provider)
    const ref = this.page.getByLabel(/Booking reference/i).or(this.page.getByPlaceholder(/reference/i)).first()
    if (await ref.isVisible().catch(() => false)) {
      await ref.fill(reference)
    }
    if (type === "flight") {
      const fn = this.page.getByPlaceholder(/AI298|Flight number/i).first()
      if (await fn.isVisible().catch(() => false)) await fn.fill("AI101")
    }
    if (type === "hotel") {
      const checkIn = this.page.getByLabel(/Check-in/i).first()
      if (await checkIn.isVisible().catch(() => false)) {
        await checkIn.fill("2026-08-01")
      }
    }
    await this.page.getByRole("button", { name: /Save booking/i }).click()
  }
}
