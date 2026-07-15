import { test, expect } from "./fixtures/testFixtures.js"
import { ExpensePage } from "./pages/ExpensePage.js"
import { apiHealth } from "./helpers/api.js"

test.describe("Expense Tracker", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("add expense", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const expenses = new ExpensePage(page)
    await expenses.openForTrip(tripUrl)
    await expenses.addExpense({ amount: "25.00", description: "E2E Café lunch" })
    await expect(page.getByText(/E2E Café lunch|25/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test("edit expense", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const expenses = new ExpensePage(page)
    await expenses.openForTrip(tripUrl)
    await expenses.addExpense({ amount: "10.00", description: "E2E Edit Target" })
    await expenses.editFirstExpense({ amount: "99.00" })
    await expect(page.getByText(/99/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test("delete expense", async ({ tripPage }) => {
    const { page, tripUrl } = tripPage
    const expenses = new ExpensePage(page)
    await expenses.openForTrip(tripUrl)
    await expenses.addExpense({ amount: "12.00", description: "E2E Delete Target" })
    await expect(page.getByText(/E2E Delete Target/i).first()).toBeVisible({ timeout: 15_000 })
    await expenses.deleteFirstExpense()
    await expect(page.getByText(/E2E Delete Target/i)).toHaveCount(0, { timeout: 15_000 })
  })
})
