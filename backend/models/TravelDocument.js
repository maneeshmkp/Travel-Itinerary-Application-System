import mongoose from "mongoose"
import { DOCUMENT_TYPE_IDS } from "../constants/documentTypes.js"
import { encryptToken, decryptToken } from "../utils/tokenEncryption.js"
import { tenantScopePlugin } from "../utils/tenantScope.js"

const ocrFieldsSchema = new mongoose.Schema(
  {
    travelerName: { type: String, trim: true, default: "" },
    passportNumber: { type: String, trim: true, default: "" },
    visaNumber: { type: String, trim: true, default: "" },
    flightNumber: { type: String, trim: true, default: "" },
    bookingReference: { type: String, trim: true, default: "" },
    hotelName: { type: String, trim: true, default: "" },
    issueDate: { type: Date },
    expiryDate: { type: Date },
  },
  { _id: false },
)

const travelDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", default: null, index: true },
    documentType: { type: String, enum: DOCUMENT_TYPE_IDS, default: "other", index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    country: { type: String, trim: true, maxlength: 120, default: "" },
    storageProvider: { type: String, enum: ["local", "cloudinary", "s3", "azure"], default: "local" },
    storageKey: { type: String, required: true, trim: true },
    fileUrl: { type: String, default: "" },
    thumbnailKey: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    fileSize: { type: Number, min: 0, default: 0 },
    documentNumberEnc: { type: String, default: "" },
    issueDate: { type: Date },
    expiryDate: { type: Date, index: true },
    issuer: { type: String, trim: true, maxlength: 200, default: "" },
    isPersonal: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false, index: true },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    ocrText: { type: String, default: "", maxlength: 50000 },
    ocrFields: { type: ocrFieldsSchema, default: () => ({}) },
    isEncrypted: { type: Boolean, default: true },
    originalFileName: { type: String, trim: true, maxlength: 255, default: "" },
  },
  { timestamps: true },
)

travelDocumentSchema.index({ userId: 1, documentType: 1 })
travelDocumentSchema.index({ userId: 1, tripId: 1 })
travelDocumentSchema.index({ userId: 1, expiryDate: 1 })
travelDocumentSchema.index({ userId: 1, isFavorite: 1 })
travelDocumentSchema.index({ userId: 1, createdAt: -1 })
travelDocumentSchema.index({ title: "text", description: "text", country: "text", ocrText: "text", tags: "text" })

travelDocumentSchema.methods.setDocumentNumber = function setDocumentNumber(value) {
  this.documentNumberEnc = value ? encryptToken(String(value).trim()) : ""
  this.isEncrypted = Boolean(value)
}

travelDocumentSchema.methods.getDocumentNumber = function getDocumentNumber() {
  return decryptToken(this.documentNumberEnc)
}

travelDocumentSchema.plugin(tenantScopePlugin)
travelDocumentSchema.index({ tenantId: 1, userId: 1 })
travelDocumentSchema.index({ tenantId: 1, tripId: 1 })

export default mongoose.model("TravelDocument", travelDocumentSchema)
