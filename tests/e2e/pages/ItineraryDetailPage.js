import { BasePage } from "./BasePage.js"

export class ItineraryDetailPage extends BasePage {
  async open(idOrPath) {
    const path = String(idOrPath).includes("/itineraries/")
      ? idOrPath.replace(/^https?:\/\/[^/]+/, "")
      : `/itineraries/${idOrPath}`
    await this.goto(path)
  }

  async openTab(label) {
    // Prefer desktop WorkspaceNav button by label
    const nav = this.page.locator("nav").filter({ hasText: label }).first()
    const btn = this.page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
    } else {
      await this.page.getByText(label, { exact: true }).first().click()
    }
    await this.page.waitForTimeout(400)
  }

  async gotoHash(hash) {
    const url = this.page.url().split("#")[0]
    await this.page.goto(`${url}#${hash.replace(/^#/, "")}`, { waitUntil: "domcontentloaded" })
    await this.page.waitForTimeout(500)
  }

  async favorite() {
    const btn = this.page.getByRole("button", { name: /^(Favorite|Saved)$/i }).first()
    await btn.click()
  }

  async share() {
    // Prefer clipboard path — stub share if needed
    await this.page.evaluate(() => {
      if (!navigator.share) return
      navigator.share = undefined
    })
    await this.page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {})
    await this.page.getByRole("button", { name: /^Share$/i }).first().click()
  }

  async enableCollaboration() {
    await this.openTab("Overview")
    const enable = this.page.getByRole("button", { name: /Enable collaborative editing/i })
    if (await enable.isVisible().catch(() => false)) {
      await enable.click()
    }
  }
}
