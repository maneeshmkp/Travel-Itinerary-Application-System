import { ALLOWED_MIME_TYPES, MAX_DOCUMENT_BYTES } from "../constants/documentTypes.js"

const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  webp: null,
  docx: [0x50, 0x4b, 0x03, 0x04],
}

function matchesMagic(buffer, bytes) {
  if (!buffer || !bytes?.length) return true
  if (buffer.length < bytes.length) return false
  return bytes.every((b, i) => buffer[i] === b)
}

function detectMimeFromMagic(buffer) {
  if (!buffer?.length) return null
  if (matchesMagic(buffer, MAGIC.pdf)) return "application/pdf"
  if (matchesMagic(buffer, MAGIC.png)) return "image/png"
  if (matchesMagic(buffer, MAGIC.jpeg)) return "image/jpeg"
  if (matchesMagic(buffer, MAGIC.docx)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString("ascii")
    const webp = buffer.subarray(8, 12).toString("ascii")
    if (riff === "RIFF" && webp === "WEBP") return "image/webp"
  }
  return null
}

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".js",
  ".msi",
  ".dll",
  ".scr",
  ".vbs",
])

export function validateDocumentFile({ buffer, mimeType, originalName, size }) {
  const errors = []
  const name = String(originalName || "").toLowerCase()
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ""

  if (BLOCKED_EXTENSIONS.has(ext)) {
    errors.push("Executable file types are not allowed")
  }

  const fileSize = Number(size) || buffer?.length || 0
  if (fileSize <= 0) errors.push("Empty file")
  if (fileSize > MAX_DOCUMENT_BYTES) errors.push(`File exceeds ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB limit`)

  const declared = String(mimeType || "").toLowerCase().trim()
  if (!ALLOWED_MIME_TYPES.includes(declared)) {
    errors.push(`MIME type not allowed: ${declared || "unknown"}`)
  }

  const detected = detectMimeFromMagic(buffer)
  if (detected && declared && detected !== declared) {
    errors.push("File content does not match declared MIME type")
  }

  if (detected === null && declared.startsWith("image/") && !matchesMagic(buffer, MAGIC.jpeg) && !matchesMagic(buffer, MAGIC.png)) {
    if (!name.endsWith(".webp")) errors.push("Unrecognized image format")
  }

  return {
    valid: errors.length === 0,
    errors,
    detectedMime: detected || declared,
    size: fileSize,
  }
}

export function scanFileForThreats(buffer) {
  if (!buffer?.length) return { safe: false, reason: "empty" }
  const head = buffer.subarray(0, 64).toString("ascii").toLowerCase()
  if (head.includes("<?php") || head.includes("<script")) {
    return { safe: false, reason: "embedded script detected" }
  }
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { safe: false, reason: "windows executable detected" }
  }
  return { safe: true }
}
