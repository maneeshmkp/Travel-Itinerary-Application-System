import crypto from "crypto"

const DEFAULT_TTL_SEC = 15 * 60

function getSecret() {
  return process.env.DOCUMENT_SIGNING_SECRET || process.env.JWT_SECRET || "dev-document-signing-secret"
}

export function createSignedDownloadToken(documentId, userId, ttlSec = DEFAULT_TTL_SEC) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  const payload = `${documentId}:${userId}:${exp}`
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return Buffer.from(`${payload}:${sig}`).toString("base64url")
}

export function verifySignedDownloadToken(token, documentId, userId) {
  if (!token) return false
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(":")
    if (parts.length !== 4) return false
    const [docId, uid, expStr, sig] = parts
    if (docId !== String(documentId) || uid !== String(userId)) return false
    const exp = Number(expStr)
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
    const payload = `${docId}:${uid}:${expStr}`
    const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}

export function parseSignedDownloadToken(token, documentId) {
  if (!token) return null
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(":")
    if (parts.length !== 4) return null
    const [docId, uid, expStr, sig] = parts
    if (docId !== String(documentId)) return null
    const exp = Number(expStr)
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null
    const payload = `${docId}:${uid}:${expStr}`
    const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    return { userId: uid, documentId: docId }
  } catch {
    return null
  }
}
