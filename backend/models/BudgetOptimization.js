import mongoose from "mongoose"
import {
  OPTIMIZATION_CATEGORIES,
  DIFFICULTY_LEVELS,
  IMPACT_LEVELS,
  RECOMMENDATION_STATUSES,
} from "../constants/budgetOptimization.js"

const recommendationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    category: { type: String, enum: OPTIMIZATION_CATEGORIES, default: "misc" },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    reason: { type: String, trim: true, maxlength: 2000, default: "" },
    estimatedSavings: { type: Number, default: 0 },
    impact: { type: String, enum: IMPACT_LEVELS, default: "medium" },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: "medium" },
    currentPrice: { type: Number, default: 0 },
    suggestedPrice: { type: Number, default: 0 },
    status: { type: String, enum: RECOMMENDATION_STATUSES, default: "pending" },
    affectedDay: { type: Number, min: 1 },
    activityId: { type: String, trim: true, default: "" },
    bookingId: { type: String, trim: true, default: "" },
    alternative: {
      name: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      mapsUrl: { type: String, trim: true, default: "" },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const categoryBreakdownSchema = new mongoose.Schema(
  {
    category: { type: String, enum: OPTIMIZATION_CATEGORIES },
    current: { type: Number, default: 0 },
    optimized: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
  },
  { _id: false },
)

const budgetOptimizationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
    currency: { type: String, trim: true, default: "INR" },
    currentBudget: { type: Number, default: 0 },
    optimizedBudget: { type: Number, default: 0 },
    potentialSavings: { type: Number, default: 0 },
    plannedBudget: { type: Number, default: 0 },
    actualSpent: { type: Number, default: 0 },
    healthScore: { type: Number, min: 0, max: 100, default: 100 },
    healthLabel: { type: String, trim: true, default: "Good" },
    recommendations: { type: [recommendationSchema], default: [] },
    acceptedRecommendations: [{ type: String }],
    comparisons: [
      {
        type: { type: String, trim: true },
        currentName: { type: String, trim: true },
        suggestedName: { type: String, trim: true },
        currentPrice: { type: Number, default: 0 },
        suggestedPrice: { type: Number, default: 0 },
        savings: { type: Number, default: 0 },
        mapsUrl: { type: String, trim: true, default: "" },
      },
    ],
    categoryBreakdown: { type: [categoryBreakdownSchema], default: [] },
    updatedItinerary: { type: mongoose.Schema.Types.Mixed, default: [] },
    charts: { type: mongoose.Schema.Types.Mixed, default: {} },
    reasoning: [{ type: String, trim: true, maxlength: 500 }],
    analysisHash: { type: String, trim: true, index: true },
    generatedByAI: { type: Boolean, default: false },
    demo: { type: Boolean, default: false },
    analyzedAt: { type: Date },
  },
  { timestamps: true },
)

budgetOptimizationSchema.index({ userId: 1, tripId: 1 }, { unique: true })

export default mongoose.model("BudgetOptimization", budgetOptimizationSchema)
