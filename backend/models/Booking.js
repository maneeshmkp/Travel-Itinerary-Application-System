import mongoose from "mongoose"
import { BOOKING_TYPE_IDS } from "../constants/bookingTypes.js"
import { BOOKING_STATUS_IDS, PAYMENT_STATUS_IDS } from "../constants/bookingStatuses.js"
import { CURRENCY_OPTIONS } from "../constants/currencies.js"
import { tenantScopePlugin } from "../utils/tenantScope.js"

const attachmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String, trim: true, maxlength: 120 },
    size: { type: Number, min: 0, default: 0 },
    category: { type: String, trim: true, default: "other" },
    dataUrl: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
    bookingType: { type: String, enum: BOOKING_TYPE_IDS, required: true, index: true },
    provider: { type: String, trim: true, default: "" },
    bookingReference: { type: String, trim: true, default: "", index: true },
    confirmationNumber: { type: String, trim: true, default: "", index: true },
    status: { type: String, enum: BOOKING_STATUS_IDS, default: "confirmed", index: true },
    departureDate: { type: Date },
    arrivalDate: { type: Date },
    checkIn: { type: Date },
    checkOut: { type: Date },
    eventDate: { type: Date },
    price: { type: Number, min: 0, default: 0 },
    currency: {
      type: String,
      enum: CURRENCY_OPTIONS.map((c) => c.code),
      default: "USD",
    },
    paymentStatus: { type: String, enum: PAYMENT_STATUS_IDS, default: "pending" },
    travelerNames: [{ type: String, trim: true }],
    seatNumber: { type: String, trim: true, default: "" },
    gate: { type: String, trim: true, default: "" },
    terminal: { type: String, trim: true, default: "" },
    flightNumber: { type: String, trim: true, default: "", index: true },
    originCode: { type: String, trim: true, uppercase: true, default: "" },
    destinationCode: { type: String, trim: true, uppercase: true, default: "" },
    hotelAddress: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "", maxlength: 5000 },
    latitude: { type: Number },
    longitude: { type: Number },
    locationName: { type: String, trim: true, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "TripExpense" },
    clientRequestId: { type: String, trim: true, sparse: true },
  },
  { timestamps: true },
)

bookingSchema.index({ userId: 1, tripId: 1 })
bookingSchema.index({ userId: 1, status: 1 })
bookingSchema.index({ userId: 1, bookingType: 1 })
bookingSchema.index({ userId: 1, departureDate: 1 })
bookingSchema.index({ userId: 1, checkIn: 1 })
bookingSchema.index({ userId: 1, createdAt: -1 })
bookingSchema.index({ userId: 1, tripId: 1, status: 1 })
// Only enforce uniqueness when clientRequestId is actually provided (a string).
// A compound sparse index still indexes docs where userId exists, storing
// clientRequestId as null, which makes every booking without a clientRequestId
// collide. A partial index avoids that.
bookingSchema.index(
  { userId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } },
)

bookingSchema.plugin(tenantScopePlugin)
bookingSchema.index({ tenantId: 1, userId: 1 })
bookingSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export default mongoose.model("Booking", bookingSchema)
