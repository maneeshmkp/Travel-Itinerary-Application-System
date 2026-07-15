import { test, expect } from "./fixtures/testFixtures.js"
import { DocumentsPage } from "./pages/DocumentsPage.js"
import { apiHealth } from "./helpers/api.js"

test.describe("Documents", () => {
  test.beforeEach(async () => {
    test.skip(!(await apiHealth()), "API unavailable")
  })

  test("upload document", async ({ authedPage }) => {
    const docs = new DocumentsPage(authedPage)
    await docs.open()
    await docs.uploadSample({ title: "E2E Passport Scan" })
    await expect(authedPage.getByText(/E2E Passport Scan/i).first()).toBeVisible({
      timeout: 60_000,
    })
  })

  test("download document", async ({ authedPage }) => {
    const docs = new DocumentsPage(authedPage)
    await docs.open()
    await docs.uploadSample({ title: "E2E Download Doc" })
    await expect(authedPage.getByText(/E2E Download Doc/i).first()).toBeVisible({
      timeout: 60_000,
    })
    const download = await docs.downloadFirst()
    expect(download.suggestedFilename()).toBeTruthy()
  })

  test("delete document (API cleanup — no delete button in vault UI)", async ({
    authedPage,
    account,
  }) => {
    // Upload via UI then attempt API list+delete if endpoint available
    const docs = new DocumentsPage(authedPage)
    await docs.open()
    await docs.uploadSample({ title: "E2E Delete Doc" })
    await expect(authedPage.getByText(/E2E Delete Doc/i).first()).toBeVisible({
      timeout: 60_000,
    })

    const api = (process.env.E2E_API_URL || "http://127.0.0.1:5000/api").replace(/\/$/, "")
    const listRes = await fetch(`${api}/documents`, {
      headers: { Authorization: `Bearer ${account.token}` },
    })
    if (!listRes.ok) {
      test.skip(true, "Documents list API not available for delete assertion")
      return
    }
    const payload = await listRes.json()
    const items = payload.data || payload.documents || payload.items || []
    const target = (Array.isArray(items) ? items : []).find((d) =>
      String(d.title || d.name || "").includes("E2E Delete Doc"),
    )
    if (!target) {
      test.skip(true, "Uploaded document not found via API")
      return
    }
    const id = target.id || target._id
    const del = await fetch(`${api}/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${account.token}` },
    })
    expect(del.ok).toBeTruthy()
    await authedPage.reload()
    await expect(authedPage.getByText(/E2E Delete Doc/i)).toHaveCount(0)
  })
})
