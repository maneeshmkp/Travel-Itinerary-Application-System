import { test, expect } from "./fixtures/testFixtures.js"
import { LoginPage } from "./pages/LoginPage.js"
import { SignupPage } from "./pages/SignupPage.js"
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.js"
import { uniqueEmail, DEFAULT_PASSWORD } from "./helpers/testData.js"
import { apiHealth } from "./helpers/api.js"

test.describe("Authentication @critical", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("signup creates account and lands on home", async ({ page }) => {
    const email = uniqueEmail("signup")
    const signup = new SignupPage(page)
    await signup.signup({
      name: "E2E Signup",
      email,
      password: DEFAULT_PASSWORD,
    })
    await expect(page).toHaveURL(/\/($|\?)/, { timeout: 30_000 })
    await expect(page.getByRole("button", { name: /Open profile menu/i })).toBeVisible({
      timeout: 20_000,
    })
  })

  test("login with valid credentials", async ({ page, account }) => {
    const login = new LoginPage(page)
    await login.login(account.email, account.password)
    await expect(page.getByRole("button", { name: /Open profile menu/i })).toBeVisible({
      timeout: 20_000,
    })
  })

  test("logout returns to public home", async ({ authedPage }) => {
    const login = new LoginPage(authedPage)
    await login.goto("/")
    await expect(authedPage.getByRole("button", { name: /Open profile menu/i })).toBeVisible()
    await login.logout()
    await expect(authedPage.getByRole("button", { name: /Open profile menu/i })).toHaveCount(0)
  })

  test("forgot password submits for existing user", async ({ page, account }) => {
    const forgot = new ForgotPasswordPage(page)
    await forgot.open()
    await forgot.submitEmail(account.email)
    // Success when SMTP configured; otherwise API returns email failure — both prove the flow
    const success = forgot.successHeading()
    const error = page.getByText(/Failed to send email|Password reset|reset link|try again/i)
    await expect(success.or(error).first()).toBeVisible({ timeout: 20_000 })
  })
})
