import { BasePage } from "./BasePage.js"

export class ForgotPasswordPage extends BasePage {
  async open() {
    await this.goto("/forgot-password")
  }

  async submitEmail(email) {
    await this.page.getByLabel(/Email Address/i).fill(email)
    await this.page.getByRole("button", { name: /Send Reset Link/i }).click()
  }

  successHeading() {
    return this.page.getByRole("heading", { name: /Check Your Email/i })
  }
}
