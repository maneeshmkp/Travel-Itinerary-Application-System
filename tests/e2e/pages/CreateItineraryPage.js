import { BasePage } from "./BasePage.js"

export class CreateItineraryPage extends BasePage {
  async open() {
    await this.goto("/create")
    await this.page.getByRole("heading", { name: /Create New Itinerary/i }).waitFor()
    await this.dismissOverlays()
  }

  async dismissOverlays() {
    await this.page.keyboard.press("Escape").catch(() => {})
    const close = this.page.getByRole("dialog").getByRole("button").first()
    if (await close.isVisible().catch(() => false)) {
      await close.click({ force: true }).catch(() => {})
    }
  }

  async fillBasics({ title, destination, description }) {
    await this.page.getByPlaceholder("Enter itinerary title").fill(title)
    await this.page.getByPlaceholder("e.g. Phuket, Thailand").fill(destination)
    if (description) {
      await this.page.getByPlaceholder(/Describe your itinerary/i).fill(description)
    }
    const highlight = this.page.getByPlaceholder(/Sunset viewpoints|local food/i).first()
    if (await highlight.isVisible().catch(() => false)) {
      await highlight.fill("E2E highlight")
    }
  }

  async fillRequiredDayDetails() {
    const hotelName = this.page.getByPlaceholder("Hotel name *").first()
    await hotelName.scrollIntoViewIfNeeded()
    await hotelName.fill("E2E Test Hotel")
    await this.page.getByPlaceholder("Hotel area or address *").first().fill("City Center")
    await this.page.getByPlaceholder("Activity name *").first().fill("City walking tour")
    await this.page.getByPlaceholder("Location *").first().fill("Old Town")
    await this.page.getByPlaceholder("Activity description *").first().fill("Explore landmarks with a local guide.")
  }

  async submit() {
    await this.dismissOverlays()
    const btn = this.page.getByRole("button", { name: /^Create Itinerary$/i })
    await btn.scrollIntoViewIfNeeded()
    await Promise.all([
      this.page
        .waitForResponse(
          (res) =>
            res.url().includes("/api/itineraries") &&
            res.request().method() === "POST" &&
            !res.url().includes("/expenses"),
          { timeout: 60_000 },
        )
        .catch(() => null),
      btn.click({ force: true }),
    ])
  }

  async create({ title, destination, description }) {
    await this.open()
    await this.fillBasics({ title, destination, description })
    await this.fillRequiredDayDetails()
    await this.submit()
    await this.page.waitForURL(/\/itineraries\/[a-f0-9]{24}/i, { timeout: 45_000 })
    return this.page.url()
  }
}
