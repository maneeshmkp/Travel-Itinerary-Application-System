/**
 * Shared page helpers for POM.
 */
export class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page
  }

  async goto(path = "/") {
    await this.page.goto(path, { waitUntil: "domcontentloaded" })
  }

  async waitForToast(text) {
    await this.page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 })
  }

  async openProfileMenu() {
    await this.page.getByRole("button", { name: /Open profile menu/i }).click()
  }

  async logout() {
    await this.openProfileMenu()
    await this.page.getByRole("menuitem", { name: /^Logout$/i }).click()
    await this.page.waitForURL((url) => url.pathname === "/" || url.pathname === "/login")
  }
}
