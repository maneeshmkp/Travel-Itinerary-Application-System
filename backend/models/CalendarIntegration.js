import mongoose from "mongoose"
import { encryptToken, decryptToken } from "../utils/tokenEncryption.js"

const PROVIDERS = ["google", "outlook"]

const calendarIntegrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: PROVIDERS, required: true, index: true },
    connected: { type: Boolean, default: false },
    accessTokenEnc: { type: String, default: "" },
    refreshTokenEnc: { type: String, default: "" },
    tokenExpiry: { type: Date },
    calendarId: { type: String, default: "primary" },
    accountEmail: { type: String, trim: true, default: "" },
    lastSync: { type: Date },
    autoSync: { type: Boolean, default: true },
  },
  { timestamps: true },
)

calendarIntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true })

calendarIntegrationSchema.methods.setTokens = function setTokens({ accessToken, refreshToken, expiresIn }) {
  if (accessToken) this.accessTokenEnc = encryptToken(accessToken)
  if (refreshToken) this.refreshTokenEnc = encryptToken(refreshToken)
  if (expiresIn) this.tokenExpiry = new Date(Date.now() + Number(expiresIn) * 1000)
  this.connected = Boolean(accessToken)
}

calendarIntegrationSchema.methods.getAccessToken = function getAccessToken() {
  return decryptToken(this.accessTokenEnc)
}

calendarIntegrationSchema.methods.getRefreshToken = function getRefreshToken() {
  return decryptToken(this.refreshTokenEnc)
}

calendarIntegrationSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    provider: this.provider,
    connected: this.connected,
    accountEmail: this.accountEmail,
    lastSync: this.lastSync,
    autoSync: this.autoSync,
    tokenExpiry: this.tokenExpiry,
    calendarId: this.calendarId,
  }
}

export default mongoose.model("CalendarIntegration", calendarIntegrationSchema)
export { PROVIDERS as CALENDAR_PROVIDERS }
