import mongoose from "mongoose"
import { EXPENSE_CATEGORY_IDS } from "../constants/expenseCategories.js"
import { CURRENCY_CODES, DEFAULT_CURRENCY } from "../constants/currencies.js"
import { PAYMENT_METHOD_IDS } from "../constants/paymentMethods.js"
import { tenantScopePlugin } from "../utils/tenantScope.js"

const tripExpenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
    category: {
      type: String,
      enum: EXPENSE_CATEGORY_IDS,
      required: true,
    },
    description: { type: String, trim: true, required: true },
    notes: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0.01 },
    currency: {
      type: String,
      enum: CURRENCY_CODES,
      default: DEFAULT_CURRENCY,
      trim: true,
    },
    dayNumber: { type: Number, min: 1 },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHOD_IDS,
      default: "cash",
    },
    receiptUrl: { type: String, trim: true, default: "" },
    spentAt: { type: Date, default: Date.now },
    clientRequestId: { type: String, trim: true, sparse: true },
  },
  { timestamps: true },
)

// Partial index so uniqueness is only enforced when clientRequestId is a string
// (a compound sparse index would still index null values and cause collisions).
tripExpenseSchema.index(
  { userId: 1, itineraryId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } },
)

tripExpenseSchema.index({ itineraryId: 1, userId: 1 })
tripExpenseSchema.index({ itineraryId: 1, userId: 1, spentAt: -1 })

tripExpenseSchema.plugin(tenantScopePlugin)
tripExpenseSchema.index({ tenantId: 1, userId: 1 })
tripExpenseSchema.index({ userId: 1, createdAt: -1 })
tripExpenseSchema.index({ tenantId: 1, createdAt: -1 })

const TripExpense = mongoose.model("TripExpense", tripExpenseSchema)
export default TripExpense
