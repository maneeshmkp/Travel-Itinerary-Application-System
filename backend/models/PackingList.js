import mongoose from "mongoose"
import { PACKING_CATEGORY_IDS } from "../constants/packingCategories.js"

const packingItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: PACKING_CATEGORY_IDS, default: "miscellaneous" },
    packed: { type: Boolean, default: false },
    quantity: { type: Number, min: 1, default: 1 },
    weightKg: { type: Number, min: 0, default: 0 },
    essential: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ["ai", "custom", "weather", "activity", "document", "booking"],
      default: "ai",
    },
    travelerId: { type: String, default: "owner" },
    travelerName: { type: String, trim: true, default: "" },
    shared: { type: Boolean, default: false },
    missing: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false },
)

const categoryFields = Object.fromEntries(
  PACKING_CATEGORY_IDS.map((id) => [id, { type: [packingItemSchema], default: [] }]),
)

const packingListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true },
    generatedByAI: { type: Boolean, default: true },
    travelStyle: { type: String, trim: true, default: "general" },
    categories: categoryFields,
    completedItems: [{ type: String }],
    customItems: { type: [packingItemSchema], default: [] },
    estimatedWeight: { type: Number, min: 0, default: 0 },
    weightByCategory: { type: Map, of: Number, default: {} },
    baggageAllowanceKg: { type: Number, min: 0, default: 23 },
    insights: [{ type: String, trim: true, maxlength: 500 }],
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    generationHash: { type: String, default: "" },
    lastGeneratedAt: { type: Date },
  },
  { timestamps: true },
)

packingListSchema.index({ userId: 1, tripId: 1 }, { unique: true })
packingListSchema.index({ tripId: 1 })

export default mongoose.model("PackingList", packingListSchema)
