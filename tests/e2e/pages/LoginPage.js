import { BasePage } from "./BasePage.js"

export class LoginPage extends BasePage {
  async open() {
    await this.goto("/login")
    await this.page.getByRole("heading", { name: /Welcome Back/i }).waitFor()
  }

  async fillCredentials(email, password) {
    await this.page.getByLabel(/Email Address/i).fill(email)
    await this.page.getByLabel(/^Password$/i).fill(password)
  }

  async submit() {
    await this.page.getByRole("button", { name: /^Sign In$/i }).click()
  }

  async login(email, password) {
    await this.open()
    await this.fillCredentials(email, password)
    await this.submit()
  }

  errorBanner() {
    return this.page.locator(".form-card .bg-red-50, .form-card [class*='red']").first()
  }
}
