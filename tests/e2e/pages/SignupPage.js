import { BasePage } from "./BasePage.js"

export class SignupPage extends BasePage {
  async open() {
    await this.goto("/signup")
    await this.page.getByRole("heading", { name: /Create|Sign|Join|Account/i }).first().waitFor({ timeout: 15_000 }).catch(() => {})
  }

  async signup({ name, email, password, confirmPassword }) {
    await this.open()
    await this.page.getByLabel(/Full Name/i).fill(name)
    await this.page.getByLabel(/Email Address/i).fill(email)
    await this.page.locator("#password").fill(password)
    await this.page.locator("#confirmPassword").fill(confirmPassword ?? password)
    await this.page.getByRole("button", { name: /^Sign Up$/i }).click()
  }
}
