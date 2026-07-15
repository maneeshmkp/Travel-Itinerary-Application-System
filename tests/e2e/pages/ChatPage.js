import { BasePage } from "./BasePage.js"

export class ChatPage extends BasePage {
  async open() {
    await this.goto("/chat")
    await this.page.getByRole("heading", { name: /Travel Copilot/i }).waitFor({ timeout: 30_000 })
  }

  async ask(message) {
    await this.page.getByPlaceholder(/Ask anything/i).fill(message)
    await this.page.getByRole("button", { name: /^Send$/i }).click()
  }
}
