import mongoose from "mongoose"
import { PLANS, TENANT_STATUSES } from "../constants/plans.js"

const tenantSettingsSchema = new mongoose.Schema(
  {
    allowGuestMembers: { type: Boolean, default: false },
    defaultCurrency: { type: String, default: "USD" },
    features: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const tenantUsageSchema = new mongoose.Schema(
  {
    aiRequests: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
    storageBytes: { type: Number, default: 0 },
    trips: { type: Number, default: 0 },
    documents: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    users: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug"],
    },
    plan: {
      type: String,
      enum: Object.values(PLANS),
      default: PLANS.FREE,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TENANT_STATUSES),
      default: TENANT_STATUSES.ACTIVE,
      index: true,
    },
    logo: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    settings: { type: tenantSettingsSchema, default: () => ({}) },
    usage: { type: tenantUsageSchema, default: () => ({}) },
  },
  { timestamps: true },
)

tenantSchema.index({ createdAt: -1 })
tenantSchema.index({ status: 1, createdAt: -1 })
tenantSchema.index({ plan: 1, status: 1, createdAt: -1 })

const Tenant = mongoose.model("Tenant", tenantSchema)
export default Tenant
