/**
 * Enterprise file security helpers for Document Vault / S3.
 * Extends existing MIME + size validation with an explicit malware-scan hook.
 */
import { validateDocumentFile, scanFileForThreats } from "../../utils/documentValidator.js"
import { getS3SignedUrl } from "../storage/s3StorageProvider.js"
import { createSignedDownloadToken, verifySignedDownloadToken } from "../../utils/signedUrl.js"
import { writeAudit, AuditActions } from "../auditService.js"
import { recordSecurityEvent } from "./securityMetrics.js"

/**
 * Validate upload + run malware hook. Does not change successful store path.
 * @returns {{ ok: boolean, errors?: string[], detectedMime?: string, size?: number, scan?: object }}
 */
export function enforceFileSecurity({ buffer, mimeType, originalName, size }) {
  const validation = validateDocumentFile({ buffer, mimeType, originalName, size })
  if (!validation.valid) {
    recordSecurityEvent("blocked", {
      reason: "file_validation",
      errors: validation.errors?.slice?.(0, 3),
    })
    return { ok: false, errors: validation.errors }
  }

  // Mock / light malware scan hook (replace with ClamAV / antivirus provider later)
  const scan = runMalwareScanHook(buffer, originalName)
  if (!scan.safe) {
    recordSecurityEvent("suspicious", {
      reason: "malware_scan",
      detail: scan.reason,
      engine: scan.engine,
    })
    return { ok: false, errors: [scan.reason || "File failed malware scan"], scan }
  }

  // Also run existing PE/script heuristics
  const legacy = scanFileForThreats(buffer)
  if (!legacy.safe) {
    recordSecurityEvent("suspicious", { reason: "threat_heuristic", detail: legacy.reason })
    return { ok: false, errors: [legacy.reason || "Suspicious file content"], scan: legacy }
  }

  return {
    ok: true,
    detectedMime: validation.detectedMime,
    size: validation.size,
    scan,
  }
}

/**
 * Pluggable malware scan — mock for enterprise wiring.
 * Set MALWARE_SCAN_PROVIDER=mock|disabled
 */
export function runMalwareScanHook(buffer, originalName = "") {
  const provider = (process.env.MALWARE_SCAN_PROVIDER || "mock").toLowerCase()
  if (provider === "disabled") {
    return { safe: true, engine: "disabled", reason: null }
  }

  // Mock engine: flag obvious EICAR test string and null-byte in filenames
  const name = String(originalName || "")
  if (/\0/.test(name) || /\.exe$/i.test(name)) {
    return { safe: false, engine: "mock", reason: "Blocked extension / null byte in name" }
  }
  const sample = buffer?.subarray?.(0, Math.min(buffer.length, 4096))?.toString?.("utf8") || ""
  if (sample.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) {
    return { safe: false, engine: "mock", reason: "EICAR test signature detected" }
  }

  return {
    safe: true,
    engine: "mock",
    reason: null,
    scannedAt: new Date().toISOString(),
  }
}

/** Issue short-lived app download token (HMAC). */
export function issueExpiringDownloadUrl(documentId, { userId, ttlSeconds = 900 } = {}) {
  const token = createSignedDownloadToken(documentId, userId, ttlSeconds)
  const base = process.env.BACKEND_URL || process.env.API_PUBLIC_URL || ""
  const path = `/api/documents/${documentId}/file?token=${encodeURIComponent(token)}`
  return {
    url: base ? `${base.replace(/\/+$/, "")}${path}` : path,
    expiresIn: ttlSeconds,
    token,
  }
}

/** Issue S3 presigned GET URL when object key known. */
export async function issueS3ExpiringUrl(key, expiresIn = 900) {
  if (!key) return null
  try {
    const url = await getS3SignedUrl(key, expiresIn)
    return { url, expiresIn }
  } catch {
    return null
  }
}

export async function auditFileUpload(req, document) {
  await writeAudit({
    action: AuditActions.FILE_UPLOAD,
    actor: req.user,
    targetType: "TravelDocument",
    targetId: document?._id || document?.id,
    metadata: {
      mimeType: document?.mimeType,
      fileSize: document?.fileSize,
      documentType: document?.documentType,
    },
    req,
  })
}

export { verifySignedDownloadToken }

export default {
  enforceFileSecurity,
  runMalwareScanHook,
  issueExpiringDownloadUrl,
  issueS3ExpiringUrl,
  auditFileUpload,
}
