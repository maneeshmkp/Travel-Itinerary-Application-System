import mongoose from "mongoose"

/**
 * Device-bound refresh sessions for JWT rotation / revocation.
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** sha256 of the current refresh token */
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    /** Stable client device id (UUID from client or server-issued) */
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: { type: String, default: "", maxlength: 120 },
    userAgent: { type: String, default: "", maxlength: 512 },
    ip: { type: String, default: "" },
    /** Family id — rotate within family; reuse detection revokes family */
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
    revokeReason: { type: String, default: "" },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 })
sessionSchema.index({ revokedAt: 1, expiresAt: 1, lastUsedAt: -1 })
sessionSchema.index({ userId: 1, deviceId: 1 })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL only if we want auto-delete; careful: mongoose TTL deletes when expiresAt passes

// NOTE: expireAfterSeconds: 0 on expiresAt would delete expired sessions automatically — good.

const Session = mongoose.model("Session", sessionSchema)
export default Session
