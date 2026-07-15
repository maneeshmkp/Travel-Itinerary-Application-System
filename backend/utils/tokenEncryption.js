import crypto from "crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12

function getKey() {
  const secret = process.env.CALENDAR_TOKEN_SECRET || process.env.JWT_SECRET || "dev-calendar-token-secret"
  return crypto.createHash("sha256").update(secret).digest()
}

export function encryptToken(plain) {
  if (!plain) return ""
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

export function decryptToken(encoded) {
  if (!encoded) return ""
  try {
    const buf = Buffer.from(encoded, "base64")
    const iv = buf.subarray(0, IV_LEN)
    const tag = buf.subarray(IV_LEN, IV_LEN + 16)
    const data = buf.subarray(IV_LEN + 16)
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
  } catch {
    return ""
  }
}

export function createOAuthState(userId, provider) {
  const payload = JSON.stringify({ userId: String(userId), provider, ts: Date.now() })
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64url")
}

export function parseOAuthState(state) {
  if (!state) return null
  try {
    const buf = Buffer.from(state, "base64url")
    const iv = buf.subarray(0, IV_LEN)
    const tag = buf.subarray(IV_LEN, IV_LEN + 16)
    const data = buf.subarray(IV_LEN + 16)
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
    const parsed = JSON.parse(json)
    if (Date.now() - parsed.ts > 15 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}
