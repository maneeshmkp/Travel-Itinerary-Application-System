import mongoose from "mongoose"
import { CURRENCY_CODES, DEFAULT_CURRENCY } from "../constants/currencies.js"
import { tenantScopePlugin } from "../utils/tenantScope.js"

const itinerarySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Itinerary title is required"],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    numberOfNights: {
      type: Number,
      required: [true, "Number of nights is required"],
      min: 1, 
      max: 30,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    days: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Day",
      },
    ],
    budget: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        enum: CURRENCY_CODES,
        default: DEFAULT_CURRENCY,
      },
    },
    /** Sum of all activity.cost values (cached; recomputed on read/write). */
    totalBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Average activity spend per trip day (totalBudget / totalDays). */
    costPerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestTimeToVisit: {
      type: String,
      trim: true,
    },
    highlights: [String],
    tags: [
      {
        type: String,
        enum: [
          "beach",
          "adventure",
          "cultural",
          "luxury",
          "budget",
          "family",
          "romantic",
          "solo",
          "spiritual",
          "mountain",
          "nature",
          "food",
          "history",
          "snowfall",
        ],
      },
    ],
    isRecommended: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      default: "System",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    collaborateEnabled: {
      type: Boolean,
      default: false,
    },
    collaborateToken: {
      type: String,
      trim: true,
      select: false,
    },
    /** Optional trip start date for reminders and weather scheduling */
    startDate: {
      type: Date,
    },
    coverImage: {
      url: { type: String, trim: true },
      alt: { type: String, trim: true },
      source: { type: String, trim: true },
      photographer: { type: String, trim: true },
      photographerUrl: { type: String, trim: true },
      query: { type: String, trim: true },
      updatedAt: { type: Date },
    },
    /** @deprecated Use coverImage.url — kept for backward compatibility reads */
    imageUrl: { type: String, trim: true },
    image: { type: String, trim: true },
    thumbnail: { type: String, trim: true },
    heroImage: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
)

// Set before validation — required `totalDays` fails if this only ran on `save`
itinerarySchema.pre("validate", function (next) {
  if (this.numberOfNights != null) {
    this.totalDays = this.numberOfNights + 1
  }
  next()
})

itinerarySchema.plugin(tenantScopePlugin)

// List / “my trips” / scheduler: filter by owner + sort by recency
itinerarySchema.index({ ownerId: 1, createdAt: -1 })
// Tenant-scoped trip lists
itinerarySchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 })
// Collaborator access checks
itinerarySchema.index({ "collaborators.userId": 1 })
// Recommendation / explore fallbacks
itinerarySchema.index({ isRecommended: 1, createdAt: -1 })
itinerarySchema.index({ destination: 1, createdAt: -1 })
itinerarySchema.index({ tags: 1 })

const Itinerary = mongoose.model("Itinerary", itinerarySchema)
export default Itinerary
