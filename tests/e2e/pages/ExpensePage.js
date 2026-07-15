import { BasePage } from "./BasePage.js"
import { ItineraryDetailPage } from "./ItineraryDetailPage.js"

export class ExpensePage extends BasePage {
  constructor(page) {
    super(page)
    this.detail = new ItineraryDetailPage(page)
  }

  async openForTrip(tripUrlOrId) {
    await this.detail.open(tripUrlOrId)
    await this.detail.gotoHash("expenses")
    await this.page.getByRole("heading", { name: /Finance|Expense/i }).first().waitFor({ timeout: 30_000 }).catch(() => {})
  }

  async openForm() {
    const log = this.page.getByRole("button", { name: /Log expense|Edit expense/i }).first()
    if (await log.isVisible().catch(() => false)) {
      await log.click()
    }
  }

  async addExpense({ amount = "42.50", description = "E2E lunch" } = {}) {
    await this.openForm()
    await this.page.getByLabel(/Amount/i).fill(String(amount))
    await this.page.getByPlaceholder(/Lunch at|Uber|café/i).fill(description)
    await this.page.getByRole("button", { name: /Add expense|Save/i }).first().click()
  }

  async editFirstExpense({ amount = "55.00" } = {}) {
    await this.page.getByLabel(/Edit expense/i).first().click()
    await this.page.getByLabel(/Amount/i).fill(String(amount))
    await this.page.getByRole("button", { name: /^Save$/i }).click()
  }

  async deleteFirstExpense() {
    this.page.once("dialog", (d) => d.accept())
    await this.page.getByLabel(/Delete expense/i).first().click()
  }
}
