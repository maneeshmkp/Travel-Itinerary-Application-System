import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { ASSIGNABLE_ROLES, ROLES } from "../constants/rbac.js"
import { TENANT_ROLES } from "../constants/plans.js"

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    /**
     * Enterprise RBAC role (platform-level).
     * Legacy values: `user`, `admin` remain valid.
     */
    role: {
      type: String,
      enum: Object.values(ROLES).filter((r) => r !== ROLES.GUEST),
      default: ROLES.USER,
    },
    /** Multi-tenant org membership */
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
      default: null,
    },
    /** Role within the tenant (owner | admin | member | guest) */
    tenantRole: {
      type: String,
      enum: Object.values(TENANT_ROLES),
      default: TENANT_ROLES.MEMBER,
    },
    /** Extra permission grants beyond the role defaults. */
    permissions: {
      type: [String],
      default: [],
    },
    /** Account lifecycle — suspended users cannot authenticate. */
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    savedItineraries: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Itinerary",
        },
      ],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

userSchema.methods.getResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex")
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000
  return resetToken
}

userSchema.statics.isAssignableRole = function (role) {
  return ASSIGNABLE_ROLES.includes(role)
}

userSchema.index({ status: 1, createdAt: -1 })
userSchema.index({ tenantId: 1, status: 1 })
userSchema.index({ role: 1, createdAt: -1 })

const User = mongoose.model("User", userSchema)
export default User
