import mongoose from "mongoose"
import { tenantScopePlugin } from "../utils/tenantScope.js"

const achievementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true, default: "🏅" },
    unlockedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const travelAnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    totalTrips: { type: Number, default: 0 },
    completedTrips: { type: Number, default: 0 },
    cancelledTrips: { type: Number, default: 0 },
    upcomingTrips: { type: Number, default: 0 },
    countriesVisited: [{ type: String, trim: true }],
    statesVisited: [{ type: String, trim: true }],
    citiesVisited: [{ type: String, trim: true }],
    totalTravelDays: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageBudget: { type: Number, default: 0 },
    averageActualExpense: { type: Number, default: 0 },
    favoriteDestination: { type: String, trim: true, default: "" },
    favoriteCountry: { type: String, trim: true, default: "" },
    favoriteCategory: { type: String, trim: true, default: "" },
    mostExpensiveTrip: { type: mongoose.Schema.Types.Mixed, default: null },
    cheapestTrip: { type: mongoose.Schema.Types.Mixed, default: null },
    longestTrip: { type: mongoose.Schema.Types.Mixed, default: null },
    shortestTrip: { type: mongoose.Schema.Types.Mixed, default: null },
    totalDistance: { type: Number, default: 0 },
    moneySaved: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    travelScore: { type: Number, min: 0, max: 100, default: 0 },
    travelScoreLabel: { type: String, trim: true, default: "Good" },
    achievements: { type: [achievementSchema], default: [] },
    charts: { type: mongoose.Schema.Types.Mixed, default: {} },
    heatmap: { type: mongoose.Schema.Types.Mixed, default: [] },
    timeline: { type: mongoose.Schema.Types.Mixed, default: [] },
    insights: [{ type: String, trim: true, maxlength: 500 }],
    aiRecommendations: { type: mongoose.Schema.Types.Mixed, default: {} },
    yearComparison: { type: mongoose.Schema.Types.Mixed, default: {} },
    currency: { type: String, trim: true, default: "INR" },
    analysisHash: { type: String, trim: true },
    recalculatedAt: { type: Date },
  },
  { timestamps: true },
)

travelAnalyticsSchema.plugin(tenantScopePlugin)

export default mongoose.model("TravelAnalytics", travelAnalyticsSchema)
