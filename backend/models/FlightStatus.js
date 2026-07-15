import mongoose from "mongoose"
import { FLIGHT_STATUS_IDS } from "../constants/flightStatus.js"

const flightStatusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", index: true },
    airline: { type: String, trim: true, default: "" },
    flightNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
    origin: { type: String, trim: true, default: "" },
    originCode: { type: String, trim: true, uppercase: true, default: "" },
    destination: { type: String, trim: true, default: "" },
    destinationCode: { type: String, trim: true, uppercase: true, default: "" },
    departureTime: { type: Date },
    arrivalTime: { type: Date },
    actualDeparture: { type: Date },
    actualArrival: { type: Date },
    terminal: { type: String, trim: true, default: "" },
    gate: { type: String, trim: true, default: "" },
    boardingTime: { type: Date },
    status: { type: String, enum: FLIGHT_STATUS_IDS, default: "Scheduled", index: true },
    baggageClaim: { type: String, trim: true, default: "" },
    aircraftType: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, min: 0 },
    delayMinutes: { type: Number, min: 0, default: 0 },
    trackingActive: { type: Boolean, default: true, index: true },
    provider: { type: String, trim: true, default: "mock" },
    lastUpdated: { type: Date, default: Date.now },
    previousGate: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

flightStatusSchema.index({ userId: 1, bookingId: 1 }, { sparse: true })
flightStatusSchema.index({ tripId: 1, trackingActive: 1 })
flightStatusSchema.index({ userId: 1, flightNumber: 1 })

export default mongoose.model("FlightStatus", flightStatusSchema)
