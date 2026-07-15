import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_UPLOAD_ROOT = path.join(__dirname, "..", "uploads")
const MAX_AGE_MS = Number(process.env.UPLOAD_TMP_RETENTION_HOURS || 48) * 60 * 60 * 1000

async function walkAndClean(dir, now, stats) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === "ENOENT") return
    throw err
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      // Only purge explicit temp folders
      if (ent.name === "tmp" || ent.name === "temp" || ent.name === ".tmp") {
        await walkAndClean(full, now, stats)
        try {
          await fs.rmdir(full)
        } catch {
          /* not empty */
        }
      }
      continue
    }
    if (!ent.isFile()) continue
    // Temp markers
    if (!/\.(tmp|part|upload)$/i.test(ent.name) && !ent.name.startsWith("tmp-")) continue
    const stat = await fs.stat(full)
    if (now - stat.mtimeMs > MAX_AGE_MS) {
      await fs.unlink(full)
      stats.removed += 1
    } else {
      stats.kept += 1
    }
  }
}

export async function processCleanupUploadsJob() {
  const root = process.env.DOCUMENT_UPLOAD_DIR || DEFAULT_UPLOAD_ROOT
  const stats = { removed: 0, kept: 0, root }
  await walkAndClean(root, Date.now(), stats)
  // Also clean OS-local tmp folder markers under uploads/tmp if present
  await walkAndClean(path.join(root, "tmp"), Date.now(), stats)
  return stats
}
