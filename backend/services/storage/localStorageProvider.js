import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = process.env.DOCUMENT_UPLOAD_DIR || path.join(__dirname, "../../uploads/documents")

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

export async function uploadLocal({ buffer, key, contentType }) {
  const fullPath = path.join(UPLOAD_ROOT, key)
  await ensureDir(path.dirname(fullPath))
  await fs.writeFile(fullPath, buffer)
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
  return {
    storageKey: key,
    fileUrl: `${base}/uploads/documents/${key.replace(/\\/g, "/")}`,
    contentType,
  }
}

export async function downloadLocal(key) {
  const fullPath = path.join(UPLOAD_ROOT, key)
  return fs.readFile(fullPath)
}

export async function deleteLocal(key) {
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, key))
  } catch {
    /* ignore missing */
  }
}

export async function deleteLocalPrefix(prefix) {
  const dir = path.join(UPLOAD_ROOT, prefix)
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

export function getLocalUploadRoot() {
  return UPLOAD_ROOT
}
