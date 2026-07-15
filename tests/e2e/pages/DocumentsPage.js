import { BasePage } from "./BasePage.js"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class DocumentsPage extends BasePage {
  async open() {
    await this.goto("/documents")
  }

  async ensureUploadForm() {
    const hide = this.page.getByRole("button", { name: /Hide upload/i })
    if (await hide.isVisible().catch(() => false)) return
    await this.page.getByRole("button", { name: /Upload document/i }).click()
  }

  /**
   * Creates a tiny PDF fixture on disk and uploads it.
   */
  async uploadSample({ title = "E2E Passport Scan" } = {}) {
    await this.ensureUploadForm()
    await this.page.getByPlaceholder(/Passport scan/i).fill(title)

    const fixturesDir = path.join(__dirname, "..", "fixtures")
    fs.mkdirSync(fixturesDir, { recursive: true })
    const filePath = path.join(fixturesDir, "sample-doc.pdf")
    // Minimal valid-enough PDF bytes for upload field (backend may validate MIME)
    if (!fs.existsSync(filePath)) {
      const pdf = `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (E2E) Tj ET
endstream
endobj
3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R >>endobj
4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj
xref
0 6
trailer<< /Root 5 0 R /Size 6 >>
startxref
0
%%EOF`
      fs.writeFileSync(filePath, pdf)
    }

    const fileInput = this.page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    const submit = this.page.getByRole("button", { name: /Upload|Save document|Submit/i }).first()
    if (await submit.isVisible().catch(() => false)) {
      await submit.click()
    }
  }

  async downloadFirst() {
    const downloadPromise = this.page.waitForEvent("download", { timeout: 30_000 })
    await this.page.getByRole("button", { name: /^Download$/i }).first().click()
    return downloadPromise
  }
}
