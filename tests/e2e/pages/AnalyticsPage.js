import { BasePage } from "./BasePage.js"

export class AnalyticsPage extends BasePage {
  async open() {
    await this.goto("/analytics")
    await this.page.getByRole("heading", { name: /Travel Analytics/i }).waitFor({ timeout: 30_000 })
  }

  async refresh() {
    const btn = this.page.getByRole("button", { name: /Refresh/i })
    if (await btn.isVisible().catch(() => false)) await btn.click()
  }
}
