import { BasePage } from "./BasePage.js"

export class NotificationsPage extends BasePage {
  async open() {
    await this.goto("/notifications")
    await this.page.getByRole("heading", { name: /Notifications/i }).waitFor()
  }

  async openBell() {
    await this.page.getByRole("button", { name: /Notifications/i }).click()
  }

  async markAllRead() {
    const btn = this.page.getByRole("button", { name: /Mark all read/i })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
    }
  }

  async markFirstRead() {
    const btn = this.page.getByRole("button", { name: /^Mark read$/i }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
    }
  }
}
