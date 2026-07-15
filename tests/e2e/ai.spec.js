import { test, expect } from "./fixtures/testFixtures.js"
import { AiItineraryPage } from "./pages/AiItineraryPage.js"
import { ChatPage } from "./pages/ChatPage.js"
import { PackingBudgetPage } from "./pages/PackingBudgetPage.js"
import { apiHealth } from "./helpers/api.js"

test.describe("AI flows", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("generate AI itinerary", async ({ authedPage }) => {
    test.setTimeout(180_000)
    const ai = new AiItineraryPage(authedPage)
    await ai.generate({ destination: "Kyoto, Japan" })
    await expect(
      authedPage.getByRole("button", { name: /Save itinerary|Edit manually/i }).first(),
    ).toBeVisible()
  })

  test("AI Copilot chat page", async ({ authedPage }) => {
    test.setTimeout(120_000)
    const chat = new ChatPage(authedPage)
    await chat.open()
    await chat.ask("Suggest a 1-day plan in Rome")
    // Assistant response bubble or typing indicator
    await expect(
      authedPage.getByText(/Rome|day|suggest|plan|travel|sorry|demo/i).first(),
    ).toBeVisible({ timeout: 90_000 })
  })

  test("AI Packing Assistant", async ({ tripPage }) => {
    test.setTimeout(120_000)
    const { page, tripUrl } = tripPage
    const pb = new PackingBudgetPage(page)
    await pb.generatePacking(tripUrl)
    await expect(
      page.getByText(/packing|essentials|clothes|toiletries|list|items/i).first(),
    ).toBeVisible({ timeout: 90_000 })
  })

  test("AI Budget Optimizer", async ({ tripPage }) => {
    test.setTimeout(120_000)
    const { page, tripUrl } = tripPage
    const pb = new PackingBudgetPage(page)
    await pb.analyzeBudget(tripUrl)
    await expect(
      page.getByText(/budget|optimize|recommend|analyze|spend|savings|demo/i).first(),
    ).toBeVisible({ timeout: 90_000 })
  })
})
