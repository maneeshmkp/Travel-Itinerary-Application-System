import { BasePage } from "./BasePage.js"
import { ItineraryDetailPage } from "./ItineraryDetailPage.js"

export class PackingBudgetPage extends BasePage {
  constructor(page) {
    super(page)
    this.detail = new ItineraryDetailPage(page)
  }

  async generatePacking(tripUrlOrId) {
    await this.detail.open(tripUrlOrId)
    await this.detail.gotoHash("packing")
    const gen = this.page.getByRole("button", { name: /Generate list|Regenerate/i }).first()
    await gen.waitFor({ state: "visible", timeout: 30_000 })
    await gen.click()
  }

  async analyzeBudget(tripUrlOrId) {
    await this.detail.open(tripUrlOrId)
    await this.detail.gotoHash("budget")
    const analyze = this.page.getByRole("button", { name: /Analyze budget|Re-analyze/i }).first()
    await analyze.waitFor({ state: "visible", timeout: 30_000 })
    await analyze.click()
  }
}
