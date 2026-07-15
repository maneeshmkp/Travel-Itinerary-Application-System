import { BasePage } from "./BasePage.js"

export class AiItineraryPage extends BasePage {
  async open() {
    await this.goto("/ai-itinerary")
  }

  async generate({ destination = "Lisbon, Portugal", nights = "3" } = {}) {
    await this.open()
    const dest = this.page.getByPlaceholder(/Kerala|leave blank|destination/i).first()
    if (await dest.isVisible().catch(() => false)) {
      await dest.fill(destination)
    }
    const nightsInput = this.page.getByLabel(/nights|days/i).first()
    if (await nightsInput.isVisible().catch(() => false)) {
      await nightsInput.fill(String(nights))
    }
    await this.page.getByRole("button", { name: /Generate itinerary/i }).click()
    await this.page
      .getByRole("button", { name: /Save itinerary|Edit manually/i })
      .first()
      .waitFor({ state: "visible", timeout: 120_000 })
  }

  async saveGenerated() {
    await this.page.getByRole("button", { name: /Save itinerary/i }).click()
  }
}
