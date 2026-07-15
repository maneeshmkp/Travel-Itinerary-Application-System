import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = path.join(__dirname, "..", "logs")
/** Keep logs newer than this (default 14 days). */
const MAX_AGE_MS = Number(process.env.LOG_RETENTION_DAYS || 14) * 24 * 60 * 60 * 1000

export async function processCleanupLogsJob() {
  let removed = 0
  let kept = 0
  try {
    const entries = await fs.readdir(LOGS_DIR, { withFileTypes: true })
    const now = Date.now()
    for (const ent of entries) {
      if (!ent.isFile()) continue
      // Never delete active winston targets
      if (ent.name === "error.log" || ent.name === "combined.log") {
        kept += 1
        continue
      }
      const full = path.join(LOGS_DIR, ent.name)
      const stat = await fs.stat(full)
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        await fs.unlink(full)
        removed += 1
      } else {
        kept += 1
      }
    }
  } catch (err) {
    if (err.code === "ENOENT") return { removed: 0, kept: 0, skipped: true }
    throw err
  }
  return { removed, kept, maxAgeDays: Number(process.env.LOG_RETENTION_DAYS || 14) }
}
